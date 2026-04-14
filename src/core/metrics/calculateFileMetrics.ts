import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { type MetricsTaskRunner, runBatchTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { FileMetrics } from './workers/types.js';

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs (~0.5ms each) that dominate when processing many files.
// CPU profiling shows workers spend 25-38% of the metrics phase in
// atomicsWaitLoop (idle between batch dispatches) at batch size 10.
// A size of 50 cuts IPC round-trips from ~100 to ~20 for a 1000-file repo,
// reducing worker idle time while still providing enough batches (~20) for
// good distribution across available CPU cores.
const METRICS_BATCH_SIZE = 50;

// Files with content.length (UTF-16 character count) at or below this threshold
// get a character-based token estimate on the main thread instead of being sent
// to worker threads for BPE tokenization. This eliminates IPC overhead (structured
// clone + message passing) for many small files that contribute little to the
// total token count.
//
// On a typical 1000-file codebase, ~40% of files are under 2048 characters,
// comprising ~11% of total content. Estimating their tokens via a chars/token
// ratio introduces < 0.2% error on the total token count while removing ~40%
// of files from the worker pipeline.
const SMALL_FILE_THRESHOLD = 2048;

// Average characters per token by encoding family, measured on typical source
// code files ≤ 2048 characters. Modern encodings (o200k, cl100k) tokenize more
// efficiently (fewer tokens per character) than older GPT-2/GPT-3 encodings
// (p50k, r50k). Using a per-encoding constant avoids systematic bias.
const CHARS_PER_TOKEN: Record<string, number> = {
  o200k_base: 3.5,
  cl100k_base: 3.5,
  p50k_base: 3.2,
  p50k_edit: 3.2,
  r50k_base: 3.2,
};
const DEFAULT_CHARS_PER_TOKEN = 3.2;

export const calculateFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: MetricsTaskRunner },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Separate small files (main-thread estimate) from large files (worker BPE).
    // Small files are estimated on the main thread to avoid the overhead of
    // structured-cloning their content to workers and back. The BPE merge cache
    // in workers stays focused on larger, more impactful files.
    // Note: the returned array order is unspecified — small-file estimates appear
    // before worker results. All consumers use path-keyed lookups.
    const charsPerToken = CHARS_PER_TOKEN[tokenCounterEncoding] ?? DEFAULT_CHARS_PER_TOKEN;
    const smallFileResults: FileMetrics[] = [];
    const largeFiles: ProcessedFile[] = [];

    for (const file of filesToProcess) {
      if (file.content.length <= SMALL_FILE_THRESHOLD) {
        smallFileResults.push({
          path: file.path,
          charCount: file.content.length,
          tokenCount: file.content.length === 0 ? 0 : Math.ceil(file.content.length / charsPerToken),
        });
      } else {
        largeFiles.push(file);
      }
    }

    logger.trace(
      `Estimated ${smallFileResults.length} small files on main thread, sending ${largeFiles.length} to workers`,
    );

    // Split large files into batches for worker processing
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < largeFiles.length; i += METRICS_BATCH_SIZE) {
      batches.push(largeFiles.slice(i, i + METRICS_BATCH_SIZE));
    }

    logger.trace(`Split ${largeFiles.length} files into ${batches.length} batches for token counting`);

    let completedItems = smallFileResults.length;
    if (completedItems > 0) {
      progressCallback(
        `Calculating metrics... (${completedItems}/${filesToProcess.length}) ${pc.dim('estimated small files')}`,
      );
    }

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await runBatchTokenCount(deps.taskRunner, {
          items: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        });

        const results: FileMetrics[] = batch.map((file, index) => ({
          path: file.path,
          charCount: file.content.length,
          tokenCount: tokenCounts[index],
        }));

        completedItems += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(
          `Calculating metrics... (${completedItems}/${filesToProcess.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedItems}/${filesToProcess.length}) ${lastFile.path}`);

        return results;
      }),
    );

    const allResults = [...smallFileResults, ...batchResults.flat()];

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms`);

    return allResults;
  } catch (error) {
    logger.error('Error during file metrics calculation:', error);
    throw error;
  }
};
