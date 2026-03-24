import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import { getTokenCounter } from './tokenCounterFactory.js';
import type { FileMetrics } from './workers/types.js';

export interface MetricsWorkerPool {
  run: (task: unknown) => Promise<unknown>;
}

const defaultDeps = {
  getTokenCounter,
};

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: Partial<typeof defaultDeps> = {},
  metricsWorkerPool?: MetricsWorkerPool,
): Promise<FileMetrics[]> => {
  const resolvedDeps = { ...defaultDeps, ...deps };
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();

    // If a pre-warmed worker pool is available, use batch counting on worker thread.
    // This keeps gpt-tokenizer's BPE initialization and CPU-bound token counting
    // off the main thread, reducing contention with security workers.
    if (metricsWorkerPool) {
      logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files on worker thread`);
      progressCallback(`Calculating metrics... (${filesToProcess.length} files)`);

      const results = (await metricsWorkerPool.run({
        batch: true,
        files: filesToProcess.map((f) => ({ path: f.path, content: f.content })),
        encoding: tokenCounterEncoding,
      })) as FileMetrics[];

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6;
      logger.trace(`Selective metrics calculation (worker) completed in ${duration.toFixed(2)}ms`);
      return results;
    }

    // Fallback: count tokens on the main thread
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files on main thread`);

    const counter = await resolvedDeps.getTokenCounter(tokenCounterEncoding);

    const results: FileMetrics[] = [];
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const tokenCount = counter.countTokens(file.content, file.path);

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
