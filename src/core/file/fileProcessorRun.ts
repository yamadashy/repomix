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
    // On timeout, SIGKILL the shell rather than the default SIGTERM so a tool that
    // ignores/traps SIGTERM cannot hang the whole pack (and pin a semaphore slot).
    killSignal: 'SIGKILL',
    // When we spawn cmd.exe ourselves, Node/libuv would otherwise re-quote each arg
    // and backslash-escape the double quotes in `resolvedCommand`, which cmd.exe does
    // not understand. Verbatim mode passes the command line through unchanged. Ignored
    // on POSIX.
    windowsVerbatimArguments: isWindows,
  });

  return stdout;
};

/**
 * Turn a raw exec failure into a human-readable cause, distinguishing a timeout
 * and a stdout-overflow from an ordinary non-zero exit so the error message is
 * actionable.
 */
const describeProcessorError = (error: unknown, timeout: number): string => {
  const err = error as (NodeJS.ErrnoException & { killed?: boolean; stderr?: string }) | undefined;
  if (err?.killed && err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
    return `output exceeded the ${FILE_PROCESSOR_MAX_BUFFER}-byte limit`;
  }
  // execFile kills the process (default signal, or SIGKILL here) when `timeout` elapses.
  if (err?.killed) {
    return `timed out after ${timeout}ms`;
  }
  const base = error instanceof Error ? error.message : String(error);
  // Surface the command's stderr (capped) so a non-zero exit is diagnosable.
  const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : '';
  return stderr ? `${base}\n  Stderr: ${stderr.slice(0, 500)}` : base;
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

// Process-wide semaphore for external command spawns. The packager runs
// `applyFileProcessors` for every root concurrently, so a per-root pool would
// multiply the cap by the number of roots (N roots × limit). A module-level
// semaphore keeps the total number of in-flight processor commands across the
// whole pack bounded regardless of how many roots run at once.
let activeProcessorCount = 0;
const processorWaitQueue: Array<() => void> = [];

const acquireProcessorSlot = (): Promise<void> => {
  if (activeProcessorCount < FILE_PROCESSOR_CONCURRENCY) {
    activeProcessorCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    processorWaitQueue.push(() => {
      activeProcessorCount++;
      resolve();
    });
  });
};

const releaseProcessorSlot = (): void => {
  activeProcessorCount--;
  const next = processorWaitQueue.shift();
  if (next) {
    next();
  }
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
  // Set once a `fail`-mode processor errors. Queued files that have not started
  // yet short-circuit instead of spawning their command, so a single early
  // failure does not spend up to `timeout` on every remaining matched file.
  let aborted = false;

  const processOne = async (rawFile: RawFile, index: number): Promise<RawFile> => {
    const processor = matches[index];
    if (!processor) {
      return rawFile;
    }

    const timeout = processor.timeout ?? DEFAULT_FILE_PROCESSOR_TIMEOUT_MS;
    const onError = processor.onError ?? 'fail';
    // Unique temp filename from the index plus a sanitized original extension.
    // The index guarantees no collision between files sharing a basename across
    // subdirectories. The extension is only kept when it is plain alphanumeric so
    // a name like `payload.%PATH%` (whose extension is `.%PATH%`) cannot smuggle a
    // Windows `cmd.exe` `%VAR%` expansion into the substituted temp path.
    const rawExt = path.extname(rawFile.path);
    const safeExt = /^\.[A-Za-z0-9_-]+$/.test(rawExt) ? rawExt : '';
    const tempFilePath = path.join(tempDir, `${index}${safeExt}`);

    await acquireProcessorSlot();
    try {
      // A prior fail-mode error already doomed the pack; skip spawning this command.
      if (aborted) {
        return rawFile;
      }

      let result: RawFile;
      let skipped = false;
      try {
        const content = await deps.runProcessorCommand({
          command: processor.command,
          content: rawFile.content,
          tempFilePath,
          timeout,
          cwd: rootDir,
        });

        // A processor that exits 0 but writes nothing to stdout (e.g. a tool that
        // edits the temp file in place, or only writes to stderr) would silently
        // blank the file. Empty output is still accepted, but warn when it replaces
        // non-empty content so the footgun is visible.
        if (content === '' && rawFile.content !== '') {
          logger.warn(
            `File processor for "${rawFile.path}" produced empty output; the file will be packed as empty. ` +
              `Check that the command writes the transformed content to stdout.`,
          );
        }
        result = { ...rawFile, content };
      } catch (error) {
        const message = describeProcessorError(error, timeout);
        if (onError !== 'skip') {
          aborted = true;
          throw new RepomixError(
            `File processor failed for "${rawFile.path}".\n` +
              `  Pattern: ${processor.pattern}\n` +
              `  Command: ${processor.command}\n` +
              `  Error: ${message}\n` +
              `  Set "onError": "skip" on this processor to fall back to the original content instead.`,
          );
        }
        logger.warn(
          `File processor for "${rawFile.path}" failed, using original content (onError: "skip"): ${message}`,
        );
        result = rawFile;
        skipped = true;
      } finally {
        // Remove this file's temp file promptly so disk use scales with concurrency,
        // not matched-file count. The tempDir itself is still removed in the outer
        // finally as a safety net.
        await fs.rm(tempFilePath, { force: true }).catch(() => {});
      }

      // Progress is reported outside the run try/catch so a throwing progressCallback
      // is not misread as a processor failure (which, under onError: "skip", would
      // discard the successfully transformed content). Runs for success and skip alike.
      completed++;
      progressCallback(
        `Processing file with command... (${completed}/${matchedCount}) ${pc.dim(rawFile.path)}${skipped ? ' (skipped)' : ''}`,
      );
      return result;
    } finally {
      releaseProcessorSlot();
    }
  };

  try {
    // Use allSettled so that a `fail`-mode rejection does not tear down the temp
    // dir while other commands are still reading their temp files. Every file
    // settles first, then the temp dir is removed in `finally`, and only then is
    // the first error (if any) surfaced.
    const settled = await Promise.allSettled(rawFiles.map((rawFile, index) => processOne(rawFile, index)));

    const firstRejection = settled.find((result) => result.status === 'rejected');
    if (firstRejection && firstRejection.status === 'rejected') {
      throw firstRejection.reason;
    }

    return settled.map((result, index) => (result.status === 'fulfilled' ? result.value : rawFiles[index]));
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
