import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

/**
 * Determine which files need token counting based on config.
 * Exported so the packager can start file metrics early (in parallel with output generation).
 */
export const getMetricsTargetPaths = (processedFiles: ProcessedFile[], config: RepomixConfigMerged): string[] => {
  const topFilesLength = config.output.topFilesLength;
  const shouldCalculateAllFiles = !!config.output.tokenCountTree;

  return shouldCalculateAllFiles
    ? processedFiles.map((file) => file.path)
    : [...processedFiles]
        .sort((a, b) => b.content.length - a.content.length)
        .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
        .map((file) => file.path);
};

export const calculateMetrics = async (
  processedFiles: ProcessedFile[],
  output: string | string[],
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  options?: {
    taskRunner?: TaskRunner<TokenCountTask, number>;
    precomputedFileMetrics?: FileMetrics[] | Promise<FileMetrics[]>;
  },
  deps = {
    calculateSelectiveFileMetrics,
    calculateOutputMetrics,
    calculateGitDiffMetrics,
    calculateGitLogMetrics,
  },
): Promise<CalculateMetricsResult> => {
  progressCallback('Calculating metrics...');

  // Use pre-initialized task runner if provided, otherwise create one
  const externalTaskRunner = options?.taskRunner;
  const taskRunner =
    externalTaskRunner ??
    initTaskRunner<TokenCountTask, number>({
      numOfTasks: processedFiles.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    });

  try {
    const outputParts = Array.isArray(output) ? output : [output];

    // Use precomputed file metrics if available (when file metrics ran in parallel with output generation),
    // otherwise calculate them now
    const fileMetricsPromise = options?.precomputedFileMetrics
      ? Promise.resolve(options.precomputedFileMetrics)
      : deps.calculateSelectiveFileMetrics(
          processedFiles,
          getMetricsTargetPaths(processedFiles, config),
          config.tokenCount.encoding,
          progressCallback,
          { taskRunner },
        );

    const [selectiveFileMetrics, outputTokenCounts, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      fileMetricsPromise,
      Promise.all(
        outputParts.map(async (part, index) => {
          const partPath =
            outputParts.length > 1
              ? buildSplitOutputFilePath(config.output.filePath, index + 1)
              : config.output.filePath;
          return await deps.calculateOutputMetrics(part, config.tokenCount.encoding, partPath, { taskRunner });
        }),
      ),
      deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner }),
      deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner }),
    ]);

    const totalTokens = outputTokenCounts.reduce((sum, count) => sum + count, 0);
    const totalFiles = processedFiles.length;
    const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

    // Build character counts for all files
    const fileCharCounts: Record<string, number> = {};
    for (const file of processedFiles) {
      fileCharCounts[file.path] = file.content.length;
    }

    // Build token counts only for top files
    const fileTokenCounts: Record<string, number> = {};
    for (const file of selectiveFileMetrics) {
      fileTokenCounts[file.path] = file.tokenCount;
    }

    return {
      totalFiles,
      totalCharacters,
      totalTokens,
      fileCharCounts,
      fileTokenCounts,
      gitDiffTokenCount: gitDiffTokenCount,
      gitLogTokenCount: gitLogTokenCount.gitLogTokenCount,
    };
  } finally {
    // Cleanup the task runner after all calculations are complete (only if we created it)
    if (!externalTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
