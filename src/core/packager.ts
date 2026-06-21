import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
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
import { loadTokenCountCache, saveTokenCountCache } from './metrics/tokenCountCache.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import { buildFileDisplayPath, buildRootLabels, usesRootLabels } from './packager/rootDisplayPath.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';
import type { PackSkillParams } from './skill/packSkill.js';

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
  sortOutputFiles,
  prefetchSortData,
  getGitDiffs,
  getGitLogs,
  // Lazy-load packSkill to defer importing the skill module chain
  // (skillSectionGenerators, skillStyle → Handlebars), which adds ~25ms
  // to module loading. Only used when --skill-generate is active (non-default).
  packSkill: async (params: PackSkillParams) => {
    const { packSkill } = await import('./skill/packSkill.js');
    return packSkill(params);
  },
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

  // Kick off the token-count cache load in the background so it is ready by
  // the time `calculateFileMetrics` reads it. The load itself is small (a few
  // hundred KB of JSON at most), but starting it here lets it overlap with
  // file search and collection rather than blocking the metrics phase.
  const tokenCacheLoadPromise = loadTokenCountCache();

  // Pre-fetch git file-change counts for sortOutputFiles while search and
  // collection are in flight, so the later sortOutputFiles call is a cache hit.
  const sortDataPromise = deps.prefetchSortData(config).catch((error) => {
    logger.trace('Failed to prefetch sort data:', error);
  });

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );

  const filePathStyle = config.output.filePathStyle;
  const rootLabels =
    usesRootLabels(filePathStyle) && rootDirs.length > 1 ? buildRootLabels(rootDirs, config.cwd) : undefined;

  // Deduplicate and sort empty directory paths for reuse during output generation,
  // avoiding a redundant searchFiles call in buildOutputGeneratorContext.
  const emptyDirPaths = config.output.includeEmptyDirectories
    ? [
        ...new Set(
          searchResultsByDir.flatMap(({ rootDir, emptyDirPaths }, index) => {
            const rootLabel = rootLabels?.[index];
            return emptyDirPaths.map((emptyDirPath) =>
              buildFileDisplayPath({
                rootDir,
                filePath: emptyDirPath,
                cwd: config.cwd,
                filePathStyle,
                rootLabel,
              }),
            );
          }),
        ),
      ].sort()
    : undefined;

  // Sort file paths
  progressCallback('Sorting files...');
  const sortedFilePathsByDir = searchResultsByDir.map(({ rootDir, filePaths }) => ({
    rootDir,
    filePaths: deps.sortPaths([...new Set(filePaths)]),
  }));
  const displayFilePathsByDir = sortedFilePathsByDir.map(({ rootDir, filePaths }, index) => {
    const rootLabel = rootLabels?.[index];
    return {
      rootDir,
      filePaths: filePaths.map((filePath) =>
        buildFileDisplayPath({
          rootDir,
          filePath,
          cwd: config.cwd,
          filePathStyle,
          rootLabel,
        }),
      ),
    };
  });
  const allFilePaths = displayFilePathsByDir.flatMap(({ filePaths }) => filePaths);

  // Pre-initialize metrics worker pool to overlap gpt-tokenizer loading with subsequent pipeline stages
  // (security check, file processing, output generation). `rootDirs` flows into the warm-up sizing so
  // a per-repo "seen" marker can switch between cold (full warm-up) and warm-likely (single worker).
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    rootDirs,
    allFilePaths.length,
    config.tokenCount.encoding,
  );

  try {
    // Run file collection and git operations in parallel since they are independent:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // Neither depends on the other's results.
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
    ]);

    const rawFiles = collectResults.flatMap((curr, index) => {
      const rootDir = sortedFilePathsByDir[index]?.rootDir;
      if (!rootDir) return [];
      const rootLabel = rootLabels?.[index];
      return curr.rawFiles.map((file) => ({
        ...file,
        path: buildFileDisplayPath({
          rootDir,
          filePath: file.path,
          cwd: config.cwd,
          filePathStyle,
          rootLabel,
        }),
      }));
    });
    const allSkippedFiles = collectResults.flatMap((curr, index) => {
      const rootDir = sortedFilePathsByDir[index]?.rootDir;
      if (!rootDir) return [];
      const rootLabel = rootLabels?.[index];
      return curr.skippedFiles.map((file) => ({
        ...file,
        path: buildFileDisplayPath({
          rootDir,
          filePath: file.path,
          cwd: config.cwd,
          filePathStyle,
          rootLabel,
        }),
      }));
    });

    // Run security check and file processing concurrently.
    // Security check uses worker threads while file processing runs on the main thread
    // (in the default non-compress/non-removeComments config), so they don't compete for CPU.
    // After both complete, filter out any suspicious files from the processed results.
    const [validationResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
      ),
      withMemoryLogging('Process Files', () => {
        progressCallback('Processing files...');
        return deps.processFiles(rawFiles, config, progressCallback);
      }),
    ]);

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    // Filter processed files to exclude suspicious ones
    const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
    const filteredProcessedFiles =
      suspiciousPathSet.size > 0 ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path)) : allProcessedFiles;

    // Pre-sort processedFiles in the same order they will appear in the generated output.
    // `generateOutput` internally calls `sortOutputFiles` as well; both share the same
    // git-log subprocess result (cached via `fileChangeCountsCache`). The array sort itself
    // runs twice but is negligible (~1ms for 1000 files). This ordering is required by the
    // fast-path in `calculateMetrics`, which walks file contents through the output string
    // in order via `extractOutputWrapper`.
    await sortDataPromise;
    const processedFiles = await deps.sortOutputFiles(filteredProcessedFiles, config);

    progressCallback('Generating output...');

    // Skill generation path — metrics not needed, return early (worker pool cleaned up by finally)
    if (config.skillGenerate !== undefined && options.skillDir) {
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
    const filePathsByRoot: FilesByRoot[] | undefined = usesRootLabels(filePathStyle)
      ? sortedFilePathsByDir.map(({ rootDir, filePaths }, index) => ({
          rootLabel: rootLabels?.[index] ?? (path.basename(rootDir) || rootDir),
          files: filePaths,
        }))
      : undefined;

    // Ensure warm-up task completes before metrics calculation
    await metricsWarmupPromise;
    // Ensure the token-count cache is loaded before calculateFileMetrics reads
    // from it. The load was started at the very beginning of pack() and is
    // typically already resolved; this await is a safety net for fast machines.
    await tokenCacheLoadPromise;

    // Generate and write output, overlapping with metrics calculation.
    // File and git metrics don't depend on the output, so they start immediately
    // while output generation runs concurrently.
    const outputPromise = deps.produceOutput(
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

    const outputForMetricsPromise = outputPromise.then((r) => r.outputForMetrics);

    const [{ outputFiles }, metrics] = await Promise.all([
      outputPromise,
      withMemoryLogging('Calculate Metrics', () =>
        deps.calculateMetrics(
          processedFiles,
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

    // Create a result object that includes metrics and security results
    const result = {
      ...metrics,
      ...(outputFiles && { outputFiles }),
      suspiciousFilesResults,
      suspiciousGitDiffResults,
      suspiciousGitLogResults,
      processedFiles,
      safeFilePaths,
      skippedFiles: allSkippedFiles,
    };

    // Persist the token-count cache for future runs. Awaited so newly produced
    // entries are not lost if the CLI exits immediately after pack(). The save
    // is atomic (writeFile-to-tmp + rename) and silently swallows errors.
    await saveTokenCountCache(rootDirs);

    logMemoryUsage('Pack - End');

    return result;
  } finally {
    await metricsWarmupPromise.catch(() => {});
    await metricsTaskRunner.cleanup();
  }
};
