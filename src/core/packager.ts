import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { processFiles } from './file/fileProcess.js';
import { searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { TARGET_CHARS_PER_CHUNK } from './metrics/calculateOutputMetrics.js';
import { METRICS_BATCH_SIZE } from './metrics/calculateSelectiveFileMetrics.js';
import { prefetchFileChangeCounts } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';
import { packSkill } from './skill/packSkill.js';

export interface PackResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
  outputFiles?: string[];
  suspiciousFilesResults: SuspiciousFileResult[];
  suspiciousGitDiffResults: SuspiciousFileResult[];
  suspiciousGitLogResults: SuspiciousFileResult[];
  processedFiles: ProcessedFile[];
  safeFilePaths: string[];
  skippedFiles: SkippedFileInfo[];
}

const defaultDeps = {
  searchFiles,
  collectFiles,
  processFiles,
  validateFileSafety,
  produceOutput,
  calculateMetrics,
  createMetricsTaskRunner,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  packSkill,
  prefetchFileChangeCounts,
};

export interface PackOptions {
  skillName?: string;
  skillDir?: string;
  skillProjectName?: string;
  skillSourceUrl?: string;
}

export const pack = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  overrideDeps: Partial<typeof defaultDeps> = {},
  explicitFiles?: string[],
  options: PackOptions = {},
): Promise<PackResult> => {
  const deps = {
    ...defaultDeps,
    ...overrideDeps,
  };

  logMemoryUsage('Pack - Start');

  // Pre-initialize metrics worker pool so gpt-tokenizer loading overlaps with searchFiles.
  // searchFiles is typically the longest early stage (300-700ms for large repos), giving
  // workers ample time to load BPE data (~250ms each) without competing for I/O with
  // the subsequent file collection phase.
  //
  // We use a pre-search task estimate since the exact file count is unknown at this point.
  // The estimate only affects worker count (via ceil(tasks/tasksPerThread)), not correctness.
  // For tokenCountTree or splitOutput configs, we use a generous upper-bound estimate to
  // ensure enough workers; for default configs, the output chunk estimate alone ensures
  // adequate scaling.
  const ESTIMATED_CHARS_PER_FILE = 5000;
  // Metrics target count: how many files will be individually tokenized
  const estimatedMetricsFileCount =
    config.output.splitOutput !== undefined || config.output.tokenCountTree
      ? 500 // Generous upper bound for large-output configs; capped by maxWorkerThreads regardless
      : Math.max(config.output.topFilesLength * 10, 50);
  // Output chunk count: the output includes ALL files, not just the metrics targets.
  // Since the actual file count is unknown before searchFiles, use a generous estimate
  // to ensure the pool scales to maxWorkerThreads for repos with 200+ files.
  const ESTIMATED_TOTAL_FILES_FOR_OUTPUT = 500;
  const estimatedOutputChunks = Math.max(
    1,
    Math.ceil((ESTIMATED_TOTAL_FILES_FOR_OUTPUT * ESTIMATED_CHARS_PER_FILE) / TARGET_CHARS_PER_CHUNK),
  );
  // +3 accounts for: 2 git diff (workTree + staged), 1 git log
  const estimatedTasks = Math.ceil(estimatedMetricsFileCount / METRICS_BATCH_SIZE) + 3 + estimatedOutputChunks;
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    estimatedTasks,
    config.tokenCount.encoding,
  );

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );

  // Deduplicate and sort empty directory paths for reuse during output generation,
  // avoiding a redundant searchFiles call in buildOutputGeneratorContext.
  const emptyDirPaths = config.output.includeEmptyDirectories
    ? [...new Set(searchResultsByDir.flatMap((r) => r.emptyDirPaths))].sort()
    : undefined;

  // Sort file paths
  progressCallback('Sorting files...');
  const allFilePaths = searchResultsByDir.flatMap(({ filePaths }) => filePaths);
  const sortedFilePaths = deps.sortPaths(allFilePaths);

  // Regroup sorted file paths by rootDir using Set for O(1) membership checks
  const filePathSetByDir = new Map(searchResultsByDir.map(({ rootDir, filePaths }) => [rootDir, new Set(filePaths)]));
  const sortedFilePathsByDir = rootDirs.map((rootDir) => ({
    rootDir,
    filePaths: sortedFilePaths.filter((filePath) => filePathSetByDir.get(rootDir)?.has(filePath) ?? false),
  }));

  try {
    // Run file collection, git operations, and sort-by-changes prefetch in parallel
    // since they are all independent I/O-bound operations:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // - prefetchFileChangeCounts spawns `git log --name-only` for sortByChanges
    //
    // The prefetch populates the module-level cache in outputSort.ts so that
    // sortOutputFiles (called later inside produceOutput) gets a cache hit
    // instead of spawning a blocking git subprocess on the critical path.
    progressCallback('Collecting files...');
    const [collectResults, gitDiffResult, gitLogResult] = await Promise.all([
      withMemoryLogging(
        'Collect Files',
        async () =>
          await Promise.all(
            sortedFilePathsByDir.map(({ rootDir, filePaths }) =>
              deps.collectFiles(filePaths, rootDir, config, progressCallback),
            ),
          ),
      ),
      deps.getGitDiffs(rootDirs, config),
      deps.getGitLogs(rootDirs, config),
      config.output.git?.sortByChanges
        ? deps.prefetchFileChangeCounts(config.cwd, config.output.git.sortByChangesMaxCommits)
        : undefined,
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Process files first since output generation and metrics depend on the result.
    // This was previously overlapped with validateFileSafety, but since the next stage
    // overlaps security with output+metrics, processFiles must complete before those start.
    // The net effect is the same or better: security check time is now hidden behind the
    // larger output+metrics phase instead of the smaller processFiles phase.
    const allProcessedFiles = await withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Skill generation path — needs security results before continuing, can't overlap
    if (config.skillGenerate !== undefined && options.skillDir) {
      const validationResult = await withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
      );
      const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
        validationResult;
      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      const processedFiles =
        suspiciousPathSet.size > 0
          ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path))
          : allProcessedFiles;

      const result = await deps.packSkill({
        rootDirs,
        config,
        options,
        processedFiles,
        allFilePaths,
        gitDiffResult,
        gitLogResult,
        suspiciousFilesResults,
        suspiciousGitDiffResults,
        suspiciousGitLogResults,
        safeFilePaths,
        skippedFiles: allSkippedFiles,
        progressCallback,
      });

      logMemoryUsage('Pack - End');
      return result;
    }

    // Build filePathsByRoot for multi-root tree generation
    // Use directory basename as the label for each root
    // Fallback to rootDir if basename is empty (e.g., filesystem root "/")
    const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
      rootLabel: path.basename(rootDir) || rootDir,
      files: filePaths,
    }));

    // Ensure warm-up task completes before metrics calculation
    await metricsWarmupPromise;

    progressCallback('Generating output...');

    // Overlap security check with output generation and metrics calculation.
    //
    // Security check uses its own worker threads (secretlint), metrics calculation
    // uses separate worker threads (gpt-tokenizer), and output generation runs on the
    // main thread — they don't share mutable state and can proceed concurrently.
    //
    // Output generation optimistically uses ALL processed files. In the common case
    // (no suspicious files detected), this is correct and saves ~100ms by removing
    // the security check from the critical path. In the rare case where files ARE
    // flagged, we regenerate output and recalculate metrics with filtered files.
    // Note: if copyToClipboard is enabled and suspicious files are found, the clipboard
    // is written twice — first with unfiltered content, then overwritten with filtered
    // content. The final clipboard state is always correct.
    const outputPromise = deps.produceOutput(
      rootDirs,
      config,
      allProcessedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      progressCallback,
      filePathsByRoot,
      emptyDirPaths,
    );

    const outputForMetricsPromise = outputPromise.then((r) => r.outputForMetrics);

    const [validationResult, { outputFiles }, metrics] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
      ),
      outputPromise,
      withMemoryLogging('Calculate Metrics', () =>
        deps.calculateMetrics(
          allProcessedFiles,
          outputForMetricsPromise,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          {
            taskRunner: metricsTaskRunner,
          },
        ),
      ),
    ]);

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    let processedFiles = allProcessedFiles;
    let finalOutputFiles = outputFiles;
    let finalMetrics = metrics;

    // If suspicious files were found, filter them out and regenerate output + metrics.
    // This is rare in practice — most repos have zero suspicious files.
    if (suspiciousFilesResults.length > 0) {
      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      processedFiles = allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path));

      const regeneratedOutputPromise = deps.produceOutput(
        rootDirs,
        config,
        processedFiles,
        allFilePaths,
        gitDiffResult,
        gitLogResult,
        progressCallback,
        filePathsByRoot,
        emptyDirPaths,
      );
      const regeneratedOutputForMetrics = regeneratedOutputPromise.then((r) => r.outputForMetrics);

      const [regeneratedOutput, regeneratedMetrics] = await Promise.all([
        regeneratedOutputPromise,
        deps.calculateMetrics(
          processedFiles,
          regeneratedOutputForMetrics,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          {
            taskRunner: metricsTaskRunner,
          },
        ),
      ]);

      finalOutputFiles = regeneratedOutput.outputFiles;
      finalMetrics = regeneratedMetrics;
    }

    // Create a result object that includes metrics and security results
    const result = {
      ...finalMetrics,
      ...(finalOutputFiles && { outputFiles: finalOutputFiles }),
      suspiciousFilesResults,
      suspiciousGitDiffResults,
      suspiciousGitLogResults,
      processedFiles,
      safeFilePaths,
      skippedFiles: allSkippedFiles,
    };

    logMemoryUsage('Pack - End');

    return result;
  } finally {
    await metricsWarmupPromise.catch(() => {});
    await metricsTaskRunner.cleanup();
  }
};
