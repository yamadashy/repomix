import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { minimatch } from 'minimatch';
import pc from 'picocolors';
import type { FileProcessor, RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from './fileTypes.js';

const execFileAsync = promisify(execFile);

// Default per-command timeout. 60s (not 30s) because the flagship use case
// `npx <tool> {file}` can spend most of a minute downloading the package on a
// cold cache before it even starts transforming.
export const DEFAULT_FILE_PROCESSOR_TIMEOUT_MS = 60_000;

// Cap on a single command's stdout. execFile's default is ~1MB, which silently
// hard-fails on larger transformed output; raise it and surface overflow as a
// clear processor error instead.
const FILE_PROCESSOR_MAX_BUFFER = 64 * 1024 * 1024;

// Limit concurrent external processes so a large repo does not spawn a process
// storm. These are external processes (not CPU-bound workers), so the exact
// number is not critical.
const FILE_PROCESSOR_CONCURRENCY = Math.min(8, Math.max(1, os.cpus().length));

// Placeholder in a processor command that is substituted with the temp file path.
const FILE_PLACEHOLDER = '{file}';

export interface RunProcessorCommandParams {
  command: string;
  content: string;
  // Absolute path of the temp file to write `content` into before running.
  tempFilePath: string;
  timeout: number;
  cwd: string;
}

/**
 * Quote a path for safe substitution into a shell command. Only our own,
 * sanitized temp path is ever substituted, but tmp directories can legitimately
 * contain spaces, so quoting is still required.
 */
const quoteForShell = (targetPath: string): string => {
  if (process.platform === 'win32') {
    // cmd.exe: wrap in double quotes. Temp paths never contain `"`.
    return `"${targetPath}"`;
  }
  // POSIX sh: single-quote and escape any embedded single quotes.
  return `'${targetPath.replace(/'/g, `'\\''`)}'`;
};

/**
 * Write the file content to a temp file, run the processor command with `{file}`
 * substituted for the (quoted) temp path, and return the command's stdout as the
 * transformed content. Throws on non-zero exit, timeout, or stdout overflow.
 *
 * A pure function of (content, command): given the same inputs it spawns the
 * same command, which keeps a future content-hash cache straightforward.
 */
export const runProcessorCommand = async (
  params: RunProcessorCommandParams,
  deps = { execFileAsync },
): Promise<string> => {
  const { command, content, tempFilePath, timeout, cwd } = params;

  await fs.writeFile(tempFilePath, content, 'utf8');

  const resolvedCommand = command.replaceAll(FILE_PLACEHOLDER, quoteForShell(tempFilePath));

  // Use the shell as the binary and pass the command via -c/-/c so pipes, npx,
  // and other shell features work. Only our quoted temp path is interpolated;
  // the command template itself comes from trusted (gated) config.
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? process.env.ComSpec || 'cmd.exe' : '/bin/sh';
  const shellArgs = isWindows ? ['/d', '/s', '/c', resolvedCommand] : ['-c', resolvedCommand];

  const { stdout } = await deps.execFileAsync(shell, shellArgs, {
    cwd,
    timeout,
    maxBuffer: FILE_PROCESSOR_MAX_BUFFER,
    encoding: 'utf8',
    // Inherit the parent environment so PATH (needed by npx and friends) is available.
    env: process.env,
  });

  return stdout;
};

/**
 * Find the first processor whose glob matches the file. Globs are matched the
 * same way as include/ignore (minimatch `{ dot: true }` against the posix path),
 * so `input.processors` patterns behave exactly like include/ignore patterns.
 * First match wins — a file is transformed by at most one processor.
 */
const matchProcessor = (filePath: string, processors: FileProcessor[]): FileProcessor | undefined => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return processors.find((processor) => minimatch(normalizedPath, processor.pattern, { dot: true }));
};

/**
 * Validate that every configured processor command contains the `{file}`
 * placeholder. Done at execution time (only when processors are enabled) rather
 * than at config parse, so a repo config with processors never breaks disabled
 * entry points (MCP, website, library callers).
 */
const validateProcessors = (processors: FileProcessor[]): void => {
  for (const processor of processors) {
    if (!processor.command.includes(FILE_PLACEHOLDER)) {
      throw new RepomixError(
        `Invalid file processor for pattern "${processor.pattern}": command must contain the ${FILE_PLACEHOLDER} placeholder.\n` +
          `  Command: ${processor.command}`,
      );
    }
  }
};

const promisePool = async <T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = Array.from({ length: items.length });
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results;
};

/**
 * Apply `input.processors` to a batch of collected files, replacing each matching
 * file's content with the output of its processor command.
 *
 * Gated behind `config.enableFileProcessors`: when the gate is off (library
 * `pack()`/`runCli()` callers, MCP, hosted website) or no processors are
 * configured, the raw files are returned unchanged.
 *
 * Called per root before the packager rewrites paths to their display form, so
 * `rawFile.path` is the per-root-relative path — the same basis include/ignore
 * and output.patterns match against.
 */
export const applyFileProcessors = async (
  rawFiles: RawFile[],
  rootDir: string,
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  deps = { runProcessorCommand },
): Promise<RawFile[]> => {
  const processors = config.input?.processors;

  if (!config.enableFileProcessors || !processors || processors.length === 0) {
    return rawFiles;
  }

  validateProcessors(processors);

  // Resolve the processor (if any) for each file up front so the concurrency
  // pool only spawns processes for matching files.
  const matches = rawFiles.map((rawFile) => matchProcessor(rawFile.path, processors));
  const matchedCount = matches.filter(Boolean).length;

  if (matchedCount === 0) {
    return rawFiles;
  }

  logger.trace(`Applying file processors to ${matchedCount} file(s) in ${rootDir}`);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc-'));
  let completed = 0;

  try {
    return await promisePool(rawFiles, FILE_PROCESSOR_CONCURRENCY, async (rawFile, index) => {
      const processor = matches[index];
      if (!processor) {
        return rawFile;
      }

      const timeout = processor.timeout ?? DEFAULT_FILE_PROCESSOR_TIMEOUT_MS;
      const onError = processor.onError ?? 'fail';
      // Unique temp filename (index prefix) so files sharing a basename across
      // subdirectories do not collide, while preserving the original extension
      // for tools that dispatch on it.
      const tempFilePath = path.join(tempDir, `${index}-${path.basename(rawFile.path)}`);

      try {
        const content = await deps.runProcessorCommand({
          command: processor.command,
          content: rawFile.content,
          tempFilePath,
          timeout,
          cwd: rootDir,
        });

        completed++;
        progressCallback(`Processing file with command... (${completed}/${matchedCount}) ${pc.dim(rawFile.path)}`);

        return { ...rawFile, content };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (onError === 'skip') {
          logger.warn(
            `File processor for "${rawFile.path}" failed, using original content (onError: "skip"): ${message}`,
          );
          completed++;
          return rawFile;
        }
        throw new RepomixError(
          `File processor failed for "${rawFile.path}".\n` +
            `  Pattern: ${processor.pattern}\n` +
            `  Command: ${processor.command}\n` +
            `  Error: ${message}\n` +
            `  Set "onError": "skip" on this processor to fall back to the original content instead.`,
        );
      }
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch((error) => {
      logger.trace(`Failed to clean up processor temp dir ${tempDir}:`, error);
    });
  }
};

/**
 * Log the file-processor status for a run: the active processors when enabled,
 * or a notice that configured processors are disabled at this entry point.
 * Centralized so every entry point (local, watch, remote) reports consistently.
 */
export const logFileProcessorStatus = (config: RepomixConfigMerged): void => {
  const processors = config.input?.processors;
  if (!processors || processors.length === 0) {
    return;
  }

  if (config.enableFileProcessors) {
    logger.log(pc.cyan(`⚙️  ${processors.length} file processor(s) active:`));
    for (const processor of processors) {
      logger.log(pc.dim(`   ${processor.pattern} → ${processor.command}`));
    }
  } else {
    logger.note(
      `${processors.length} file processor(s) are configured but disabled at this entry point for security.\n` +
        'File processors run arbitrary commands and are only enabled for local CLI runs ' +
        '(and remote runs with --remote-trust-config).',
    );
  }
};
