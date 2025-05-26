/**
 * File processing functionality
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import strip from 'strip-comments';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';

/**
 * Options for processing files
 */
export interface FileProcessOptions {
  /**
   * Whether to remove comments
   */
  removeComments: boolean;

  /**
   * Whether to remove empty lines
   */
  removeEmptyLines: boolean;
}

/**
 * Process files according to options
 */
export const processFiles = async (filePaths: string[], options: FileProcessOptions): Promise<ProcessedFile[]> => {
  try {
    const rawFiles = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return { path: filePath, content };
        } catch (error) {
          logger.warn(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return { path: filePath, content: '' };
        }
      }),
    );

    const processedFiles = rawFiles.map((rawFile) => processFile(rawFile, options));

    return processedFiles;
  } catch (error) {
    throw new RepomixError(`Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Process a single file
 */
export const processFile = (rawFile: RawFile, options: FileProcessOptions): ProcessedFile => {
  let content = rawFile.content;

  if (options.removeComments) {
    try {
      content = strip(content);
    } catch (error) {
      logger.warn(
        `Failed to strip comments from ${rawFile.path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  if (options.removeEmptyLines) {
    content = content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
  }

  return {
    path: rawFile.path,
    content,
  };
};
