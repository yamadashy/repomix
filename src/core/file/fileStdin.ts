import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

export interface StdinFileResult {
  filePaths: string[];
  emptyDirPaths: string[];
}

/**
 * Reads file paths from stdin, one per line.
 * Filters out empty lines and comments (lines starting with #).
 * Converts relative paths to absolute paths based on the current working directory.
 */
export const readFilePathsFromStdin = async (cwd: string): Promise<StdinFileResult> => {
  logger.trace('Reading file paths from stdin...');

  try {
    // Read from stdin
    const stdin = process.stdin;
    stdin.setEncoding('utf8');

    let data = '';
    
    // Check if stdin is a TTY (interactive mode)
    if (stdin.isTTY) {
      throw new RepomixError('No data provided via stdin. Please pipe file paths to repomix when using --stdin flag.');
    }

    // Read all data from stdin
    for await (const chunk of stdin) {
      data += chunk;
    }

    if (!data.trim()) {
      throw new RepomixError('No file paths provided via stdin.');
    }

    // Parse the input - split by lines and filter out empty lines and comments
    const lines = data.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (lines.length === 0) {
      throw new RepomixError('No valid file paths found in stdin input.');
    }

    // Convert relative paths to absolute paths
    const filePaths = lines.map(line => {
      const filePath = path.isAbsolute(line) ? line : path.resolve(cwd, line);
      logger.trace(`Resolved path: ${line} -> ${filePath}`);
      return filePath;
    });

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