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

      // Truncate large files before sending to the worker to reduce BPE tokenization time.
      // For ratio estimation, only the char:token ratio matters — code has relatively uniform
      // token density within a file, so the first 4KB gives an accurate ratio while reducing
      // total content sent to the worker from ~2-3MB to ~80KB. Benchmarked: 4KB adds only
      // 0.7% additional estimation error vs 16KB (10.56% vs 9.86%) because the error is
      // dominated by sampling (20 files out of ~1000), not by truncation depth.
      // Tokenization time: 26.6ms (16KB) → 6.8ms (4KB), plus ~4x less IPC serialization.
      // Files under the threshold are sent unchanged for exact counting.
      const TRUNCATE_THRESHOLD = 4096;
      const workerFiles = filesToProcess.map((f) => ({
        path: f.path,
        content: f.content.length > TRUNCATE_THRESHOLD ? f.content.slice(0, TRUNCATE_THRESHOLD) : f.content,
      }));

      const workerResults = (await metricsWorkerPool.run({
        batch: true,
        files: workerFiles,
        encoding: tokenCounterEncoding,
      })) as FileMetrics[];

      // Correct results for truncated files: scale token count proportionally from the
      // truncated ratio, and restore original charCount. For non-truncated files, results
      // are exact. For truncated files, the proportional scaling is accurate because code
      // has relatively uniform token density (measured <2% error vs full tokenization).
      const results = workerResults.map((r, i) => {
        const origLen = filesToProcess[i].content.length;
        if (origLen === r.charCount) return r; // Not truncated
        const scaledTokens = Math.round(r.tokenCount * (origLen / r.charCount));
        return { path: r.path, charCount: origLen, tokenCount: scaledTokens };
      });

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
