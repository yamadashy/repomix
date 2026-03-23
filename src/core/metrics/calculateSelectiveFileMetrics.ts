import pc from 'picocolors';
import { logger, repomixLogLevels } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenCountEncoding, TokenCounter } from './TokenCounter.js';
import type { FileMetrics } from './workers/types.js';

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  _tokenCounterEncoding: TokenCountEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { tokenCounter: TokenCounter },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;
  const startTime = isTracing ? process.hrtime.bigint() : 0n;

  if (isTracing) {
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files on main thread`);
  }

  // Count tokens directly on the main thread — gpt-tokenizer is pure JS,
  // so worker thread structured clone overhead far exceeds the computation cost.
  const results: FileMetrics[] = [];
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const tokenCount = deps.tokenCounter.countTokens(file.content, file.path);
    results.push({
      path: file.path,
      charCount: file.content.length,
      tokenCount,
    });
  }

  progressCallback(`Calculating metrics... (${filesToProcess.length}/${filesToProcess.length}) ${pc.dim('done')}`);

  if (isTracing) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);
  }

  return results;
};
