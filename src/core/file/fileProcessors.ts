import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { minimatch } from 'minimatch';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { mapWithConcurrency } from '../../shared/asyncMap.js';
import { RepomixError } from '../../shared/errorHandle.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from './fileTypes.js';

const execFileAsync = promisify(execFile);
const FILE_PROCESSOR_CONCURRENCY = 4;
const FILE_PROCESSOR_TIMEOUT_MS = 30_000;
const FILE_PROCESSOR_MAX_BUFFER = 10 * 1024 * 1024;

export interface RunCommandOptions {
  cwd: string;
  timeout: number;
  maxBuffer: number;
}

export interface FileProcessorDeps {
  mkdtemp: (prefix: string) => Promise<string>;
  writeFile: (file: string, data: string, encoding: BufferEncoding) => Promise<void>;
  rm: (file: string, options: { force: boolean; recursive: boolean }) => Promise<void>;
  runCommand: (command: string, options: RunCommandOptions) => Promise<{ stdout: string }>;
}

const runShellCommand = async (command: string, options: RunCommandOptions): Promise<{ stdout: string }> => {
  const shell = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : '/bin/sh';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-c', command];
  const result = await execFileAsync(shell, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: options.maxBuffer,
    timeout: options.timeout,
    windowsHide: true,
  });
  return { stdout: String(result.stdout) };
};

const defaultDeps: FileProcessorDeps = {
  mkdtemp: fs.mkdtemp,
  writeFile: fs.writeFile,
  rm: fs.rm,
  runCommand: runShellCommand,
};

const normalizePathForGlob = (filePath: string): string => filePath.replace(/\\/g, '/');

const findProcessorCommand = (filePath: string, fileProcessors: Record<string, string>): [string, string] | null => {
  const normalizedPath = normalizePathForGlob(filePath);
  return Object.entries(fileProcessors).find(([pattern]) => minimatch(normalizedPath, pattern, { dot: true })) ?? null;
};

const quoteForShell = (filePath: string): string => {
  if (process.platform === 'win32') {
    return `"${filePath.replace(/"/g, '""')}"`;
  }
  return `'${filePath.replace(/'/g, "'\\''")}'`;
};

const safeTempFileName = (filePath: string): string => {
  const basename = path.basename(filePath);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'input';
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const processFile = async (
  rawFile: RawFile,
  rootDir: string,
  pattern: string,
  commandTemplate: string,
  deps: FileProcessorDeps,
): Promise<RawFile> => {
  if (!commandTemplate.includes('{file}')) {
    throw new RepomixError(`File processor for pattern "${pattern}" must include {file}.`);
  }

  const tempDir = await deps.mkdtemp(path.join(os.tmpdir(), 'repomix-file-processors-'));
  try {
    const tempFilePath = path.join(tempDir, safeTempFileName(rawFile.path));
    await deps.writeFile(tempFilePath, rawFile.content, 'utf8');

    const command = commandTemplate.replaceAll('{file}', quoteForShell(tempFilePath));
    const { stdout } = await deps.runCommand(command, {
      cwd: rootDir,
      maxBuffer: FILE_PROCESSOR_MAX_BUFFER,
      timeout: FILE_PROCESSOR_TIMEOUT_MS,
    });
    return { ...rawFile, content: stdout };
  } catch (error) {
    throw new RepomixError(`Failed to process ${rawFile.path} with file processor "${pattern}": ${formatError(error)}`);
  } finally {
    await deps.rm(tempDir, { force: true, recursive: true });
  }
};

export const applyFileProcessors = async (
  rawFiles: RawFile[],
  rootDir: string,
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  deps: FileProcessorDeps = defaultDeps,
): Promise<RawFile[]> => {
  const fileProcessors = config.fileProcessors;
  if (Object.keys(fileProcessors).length === 0) {
    return rawFiles;
  }

  return await mapWithConcurrency(rawFiles, FILE_PROCESSOR_CONCURRENCY, async (rawFile, index) => {
    const processor = findProcessorCommand(rawFile.path, fileProcessors);
    if (!processor) {
      return rawFile;
    }

    const [pattern, command] = processor;
    progressCallback(`Processing file processor... (${index + 1}/${rawFiles.length}) ${pc.dim(rawFile.path)}`);
    return await processFile(rawFile, rootDir, pattern, command, deps);
  });
};
