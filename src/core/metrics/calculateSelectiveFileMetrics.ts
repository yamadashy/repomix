import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { TokenCounter } from './TokenCounter.js';
import type { TokenEncoding } from './tokenEncoding.js';
import type { FileMetrics } from './workers/types.js';

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files on main thread`);

    // Count tokens on main thread — gpt-tokenizer (pure JS) is fast enough that
    // worker thread overhead (pool init, structured clone serialization, message passing)
    // exceeds the computation cost.
    const counter = new TokenCounter(tokenCounterEncoding);
    const results: FileMetrics[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      results.push({
        path: file.path,
        charCount: file.content.length,
        tokenCount: counter.countTokens(file.content, file.path),
      });

      if ((i + 1) % 100 === 0 || i === filesToProcess.length - 1) {
        progressCallback(`Calculating metrics... (${i + 1}/${filesToProcess.length}) ${pc.dim(file.path)}`);
        logger.trace(`Calculating metrics... (${i + 1}/${filesToProcess.length})`);
      }
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
