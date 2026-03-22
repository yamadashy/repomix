import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { getTokenCounter } from './tokenCounterFactory.js';
import type { TokenEncoding } from './tokenEncoding.js';
import type { FileMetrics } from './workers/types.js';

export interface SelectiveMetricsResult {
  fileMetrics: FileMetrics[];
  totalFileTokens: number;
}

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
): Promise<SelectiveMetricsResult> => {
  if (processedFiles.length === 0) {
    return { fileMetrics: [], totalFileTokens: 0 };
  }

  const targetFileSet = new Set(targetFilePaths);

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting metrics calculation for ${processedFiles.length} files on main thread`);

    // Count tokens on main thread — gpt-tokenizer (pure JS) is fast enough that
    // worker thread overhead (pool init, structured clone serialization, message passing)
    // exceeds the computation cost.
    //
    // Count tokens for ALL files to get totalFileTokens (used to derive output token
    // count without re-tokenizing the full output string). Only track per-file metrics
    // for target files (used for top-N display and token count tree).
    const counter = getTokenCounter(tokenCounterEncoding);
    const fileMetrics: FileMetrics[] = [];
    let totalFileTokens = 0;

    for (let i = 0; i < processedFiles.length; i++) {
      const file = processedFiles[i];
      const tokenCount = counter.countTokens(file.content, file.path);
      totalFileTokens += tokenCount;

      if (targetFileSet.has(file.path)) {
        fileMetrics.push({
          path: file.path,
          charCount: file.content.length,
          tokenCount,
        });
      }

      if ((i + 1) % 100 === 0 || i === processedFiles.length - 1) {
        progressCallback(`Calculating metrics... (${i + 1}/${processedFiles.length}) ${pc.dim(file.path)}`);
        logger.trace(`Calculating metrics... (${i + 1}/${processedFiles.length})`);
      }
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Metrics calculation completed in ${duration.toFixed(2)}ms`);

    return { fileMetrics, totalFileTokens };
  } catch (error) {
    logger.error('Error during metrics calculation:', error);
    throw error;
  }
};
