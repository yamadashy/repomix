import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import { getTokenCounter } from './tokenCounterFactory.js';
import type { FileMetrics } from './workers/types.js';

const defaultDeps = {
  getTokenCounter,
};

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: Partial<typeof defaultDeps> = {},
): Promise<FileMetrics[]> => {
  const resolvedDeps = { ...defaultDeps, ...deps };
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files on main thread`);

    const counter = await resolvedDeps.getTokenCounter(tokenCounterEncoding);

    const results: FileMetrics[] = [];
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      let tokenCount = counter.countTokens(file.content, file.path);
      if (tokenCount === 0 && file.content.length > 0) {
        tokenCount = counter.countTokensPlainText(file.content, file.path);
      }

      results.push({
        path: file.path,
        charCount: file.content.length,
        tokenCount,
      });

      progressCallback(`Calculating metrics... (${i + 1}/${filesToProcess.length}) ${pc.dim(file.path)}`);
      logger.trace(`Calculating metrics... (${i + 1}/${filesToProcess.length}) ${file.path}`);
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
