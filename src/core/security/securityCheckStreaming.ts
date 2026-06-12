import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { SECURITY_CHECK_BATCH_SIZE, type SecurityTaskRunner, type SuspiciousFileResult } from './securityCheck.js';
import type { SecurityCheckItem } from './workers/securityCheckWorker.js';

// Batch outcomes are captured (instead of letting the task promise reject) so
// that batches dispatched during file collection can never surface as
// unhandled rejections if the pipeline fails before finalize() is awaited.
type SecurityBatchOutcome =
  | { results: (SuspiciousFileResult | null)[]; error?: undefined }
  | { results?: undefined; error: unknown };

export interface SecurityCheckStream {
  /**
   * Queue a single item for security checking. Full batches are dispatched to
   * the worker pool immediately, so lint work overlaps with file collection.
   */
  addFile: (item: SecurityCheckItem) => void;
  /**
   * Dispatch any remaining items (plus git diff/log content and any raw file
   * that was not streamed via addFile) and await all batch results.
   * Returns the same results, in the same order, as `runSecurityCheck`.
   */
  finalize: (
    rawFiles: RawFile[],
    progressCallback?: RepomixProgressCallback,
    gitDiffResult?: GitDiffResult,
    gitLogResult?: GitLogResult,
  ) => Promise<SuspiciousFileResult[]>;
}

/**
 * Create a streaming security-check session.
 *
 * `runSecurityCheck` dispatches all batches only after file collection has
 * fully completed, which puts the entire lint wall time (~all batches across
 * the worker pool) on the critical path after collection. Since the security
 * workers are already spawned (pre-warmed in `pack()`) and otherwise idle
 * while collection performs I/O on the main thread, streaming each full batch
 * as soon as its files are collected lets nearly all lint work finish inside
 * the collection window.
 *
 * Behavior is identical to `runSecurityCheck`:
 * - The same items are checked with the same batch size; only dispatch timing
 *   changes. Files stream in collection-completion order, so `finalize`
 *   re-orders suspicious file results back to the canonical `rawFiles` order.
 * - `finalize` also enqueues any raw file that never arrived via `addFile`
 *   (e.g. a custom `collectFiles` implementation that ignores the
 *   `onFileCollected` callback), so no file can skip the check.
 * - Per-batch progress is only reported once `finalize` runs and the total
 *   item count is known; before that, collection progress owns the spinner.
 */
export const createSecurityCheckStream = (taskRunner: SecurityTaskRunner): SecurityCheckStream => {
  const batchPromises: Promise<SecurityBatchOutcome>[] = [];
  const streamedFilePaths = new Set<string>();
  let buffer: SecurityCheckItem[] = [];
  let dispatchedItemCount = 0;
  let completedItemCount = 0;
  // Set when finalize() runs; enables per-batch progress reporting with a true total.
  let reportBatchProgress: ((batch: SecurityCheckItem[]) => void) | undefined;
  let firstDispatchAt: bigint | undefined;

  const dispatchBuffer = () => {
    if (buffer.length === 0) {
      return;
    }
    const batch = buffer;
    buffer = [];
    dispatchedItemCount += batch.length;
    firstDispatchAt ??= process.hrtime.bigint();
    batchPromises.push(
      taskRunner.run({ items: batch }).then(
        (results) => {
          completedItemCount += batch.length;
          reportBatchProgress?.(batch);
          return { results };
        },
        (error: unknown) => ({ error }),
      ),
    );
  };

  const addItem = (item: SecurityCheckItem) => {
    buffer.push(item);
    if (buffer.length >= SECURITY_CHECK_BATCH_SIZE) {
      dispatchBuffer();
    }
  };

  const addFile = (item: SecurityCheckItem) => {
    streamedFilePaths.add(item.filePath);
    addItem(item);
  };

  const finalize = async (
    rawFiles: RawFile[],
    progressCallback: RepomixProgressCallback = () => {},
    gitDiffResult?: GitDiffResult,
    gitLogResult?: GitLogResult,
  ): Promise<SuspiciousFileResult[]> => {
    const finalizeStartAt = process.hrtime.bigint();

    // Safety net: check any raw file that was not streamed during collection.
    // In the normal pack() flow this finds nothing.
    for (const file of rawFiles) {
      if (!streamedFilePaths.has(file.path)) {
        addFile({ filePath: file.path, content: file.content, type: 'file' });
      }
    }

    // Git diff/log content is only available after the collect+git phase, so
    // it always lands in the trailing batches — mirroring runSecurityCheck,
    // which appends these items after all file items.
    if (gitDiffResult?.workTreeDiffContent) {
      addItem({ filePath: 'Working tree changes', content: gitDiffResult.workTreeDiffContent, type: 'gitDiff' });
    }
    if (gitDiffResult?.stagedDiffContent) {
      addItem({ filePath: 'Staged changes', content: gitDiffResult.stagedDiffContent, type: 'gitDiff' });
    }
    if (gitLogResult?.logContent) {
      addItem({ filePath: 'Git log history', content: gitLogResult.logContent, type: 'gitLog' });
    }
    dispatchBuffer();

    const totalItems = dispatchedItemCount;
    if (totalItems === 0) {
      return [];
    }

    // From here on the total is known, so report progress for every batch that
    // completes during the finalize wait.
    reportBatchProgress = (batch) => {
      const lastItem = batch[batch.length - 1];
      progressCallback(`Running security check... (${completedItemCount}/${totalItems}) ${pc.dim(lastItem.filePath)}`);
      logger.trace(`Running security check... (${completedItemCount}/${totalItems}) ${lastItem.filePath}`);
    };

    logger.trace(`Starting security check for ${totalItems} files/content in ${batchPromises.length} batches`);

    const outcomes = await Promise.all(batchPromises);
    const failure = outcomes.find((outcome) => outcome.error !== undefined);
    if (failure) {
      logger.error('Error during security check:', failure.error);
      throw failure.error;
    }

    const endAt = process.hrtime.bigint();
    const totalDuration = Number(endAt - (firstDispatchAt ?? finalizeStartAt)) / 1e6;
    const finalizeWait = Number(endAt - finalizeStartAt) / 1e6;
    logger.trace(
      `Security check completed in ${totalDuration.toFixed(2)}ms (streamed; ${finalizeWait.toFixed(2)}ms after collection)`,
    );

    const suspiciousResults = outcomes
      .flatMap((outcome) => outcome.results ?? [])
      .filter((result): result is SuspiciousFileResult => result !== null);

    return sortToCanonicalOrder(suspiciousResults, rawFiles);
  };

  return { addFile, finalize };
};

/**
 * Restore the result ordering produced by `runSecurityCheck`: file results in
 * `rawFiles` order, followed by gitDiff results, then gitLog results. Streamed
 * file batches complete in collection order, which is nondeterministic.
 */
const sortToCanonicalOrder = (
  suspiciousResults: SuspiciousFileResult[],
  rawFiles: RawFile[],
): SuspiciousFileResult[] => {
  const fileResults: SuspiciousFileResult[] = [];
  const gitDiffResults: SuspiciousFileResult[] = [];
  const gitLogResults: SuspiciousFileResult[] = [];
  for (const result of suspiciousResults) {
    if (result.type === 'file') {
      fileResults.push(result);
    } else if (result.type === 'gitDiff') {
      gitDiffResults.push(result);
    } else {
      gitLogResults.push(result);
    }
  }

  if (fileResults.length > 1) {
    const orderByPath = new Map(rawFiles.map((file, index) => [file.path, index]));
    // Every result path comes from rawFiles, so the fallback is unreachable;
    // sort-to-end is the safer sentinel should that invariant ever break.
    const orderOf = (result: SuspiciousFileResult) => orderByPath.get(result.filePath) ?? Number.MAX_SAFE_INTEGER;
    fileResults.sort((a, b) => orderOf(a) - orderOf(b));
  }

  return [...fileResults, ...gitDiffResults, ...gitLogResults];
};
