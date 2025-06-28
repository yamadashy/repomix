import path from 'node:path';
import readline from 'node:readline/promises';
import type { Readable } from 'node:stream';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

export interface StdinFileResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

export interface StdinDependencies {
  stdin: NodeJS.ReadableStream & { isTTY?: boolean };
  createReadlineInterface: (options: { input: Readable }) => readline.Interface;
}

/**
 * Filters and validates lines from stdin input.
 * Removes empty lines and comments (lines starting with #).
 */
export const filterValidLines = (lines: string[]): string[] => {
  return lines.map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
};

/**
 * Resolves relative paths to absolute paths and deduplicates them.
 */
export const resolveAndDeduplicatePaths = (lines: string[], cwd: string): string[] => {
  const resolvedPaths = lines.map((line) => {
    const filePath = path.isAbsolute(line) ? path.normalize(line) : path.normalize(path.resolve(cwd, line));
    logger.trace(`Resolved path: ${line} -> ${filePath}`);
    return filePath;
  });

  return [...new Set(resolvedPaths)];
};

/**
 * Reads lines from a readable stream using readline interface.
 */
export const readLinesFromStream = async (
  input: Readable,
  createInterface: (options: { input: Readable }) => readline.Interface = readline.createInterface,
): Promise<string[]> => {
  const rl = createInterface({ input });
  const lines: string[] = [];

  for await (const line of rl) {
    lines.push(line);
  }

  return lines;
};

/**
 * Reads file paths from stdin, one per line.
 * Filters out empty lines and comments (lines starting with #).
 * Converts relative paths to absolute paths based on the current working directory.
 */
export const readFilePathsFromStdin = async (
  cwd: string,
  deps: StdinDependencies = {
    stdin: process.stdin,
    createReadlineInterface: readline.createInterface,
  },
): Promise<StdinFileResult> => {
  logger.trace('Reading file paths from stdin...');

  try {
    const { stdin, createReadlineInterface } = deps;

    // Check if stdin is a TTY (interactive mode)
    if (stdin.isTTY) {
      throw new RepomixError(
        'No data provided via stdin. Please pipe file paths to repomix or specify a directory argument.',
      );
    }

    // Read all lines from stdin
    const rawLines = await readLinesFromStream(stdin as Readable, createReadlineInterface);

    // Filter out empty lines and comments
    const validLines = filterValidLines(rawLines);

    if (validLines.length === 0) {
      throw new RepomixError('No valid file paths found in stdin input.');
    }

    // Convert relative paths to absolute paths and deduplicate
    const filePaths = resolveAndDeduplicatePaths(validLines, cwd);

    logger.trace(`Found ${filePaths.length} file paths from stdin`);

    return {
      filePaths,
      emptyDirPaths: [], // Empty directories not supported with stdin input
    };
  } catch (error) {
    if (error instanceof RepomixError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new RepomixError(`Failed to read file paths from stdin: ${error.message}`);
    }

    throw new RepomixError('An unexpected error occurred while reading from stdin.');
  }
};
