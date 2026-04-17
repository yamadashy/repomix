import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type FileCollectResults, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { processFiles } from './file/fileProcess.js';
import { searchEmptyDirectories, searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import { type SuspiciousFileResult, warmupSecurityWorkerPool } from './security/securityCheck.js';
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
  searchEmptyDirectories,
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

  // Start metrics worker pool creation + warmup as a non-blocking promise.
  // The tinypool module is lazy-loaded (~34ms), overlapping with the pipeline
  // below. The pool is awaited just before metrics calculation begins.
  const metricsSetupPromise = deps.createMetricsTaskRunner(Number.MAX_SAFE_INTEGER, config.tokenCount.encoding);
  metricsSetupPromise.catch(() => {});

  if (config.security.enableSecurityCheck && !overrideDeps.validateFileSafety) {
    warmupSecurityWorkerPool();
  }

  try {
    // Pre-fetch git file-change counts for sortOutputFiles while search and
    // collection are in flight, so the later sortOutputFiles call is a cache hit.
    const sortDataPromise = deps.prefetchSortData(config).catch((error) => {
      logger.trace('Failed to prefetch sort data:', error);
    });

    // Disable empty directory search inside searchFiles — it is launched
    // concurrently with file collection via emptyDirPromise below, keeping
    // the ~100ms globby directory scan off the sequential critical path.
    const searchConfig = config.output.includeEmptyDirectories
      ? { ...config, output: { ...config.output, includeEmptyDirectories: false } }
      : config;

    // Start git operations and empty directory scan before searchFiles.
    // These only need rootDirs and config (not the search results), so they
    // can run concurrently with searchFiles. Since searchFiles now uses async
    // execFile (non-blocking), the event loop processes git subprocess
    // completions during the ~17ms git ls-files wait, giving the git diff/log
    // subprocesses a head start before the collect phase.
    const gitDiffPromise = deps.getGitDiffs(rootDirs, config);
    const gitLogPromise = deps.getGitLogs(rootDirs, config);
    // Suppress unhandled rejection if searchFiles throws before Promise.all
    // consumes these promises. The original promise is still awaited in
    // Promise.all — .catch() only prevents the "unhandled rejection" signal.
    Promise.resolve(gitDiffPromise).catch(() => {});
    Promise.resolve(gitLogPromise).catch(() => {});
    const emptyDirPromise = config.output.includeEmptyDirectories
      ? Promise.all(rootDirs.map((rootDir) => deps.searchEmptyDirectories(rootDir, config))).then((results) =>
          [...new Set(results.flat())].sort(),
        )
      : undefined;

    // Start file collection as soon as git ls-files returns (before ignore
    // filtering completes), allowing collectFiles I/O to overlap with the
    // ignore-pattern filtering. Falls back to sequential collection when
    // the git fast-path is not used (globby, explicit files, non-git repos).
    const earlyCollectPromises = new Map<string, Promise<FileCollectResults>>();

    progressCallback('Searching for files...');
    const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
      Promise.all(
        rootDirs.map(async (rootDir) => {
          const result = await deps.searchFiles(rootDir, searchConfig, explicitFiles, {
            onPreFilterCandidates: (candidates) => {
              progressCallback('Collecting files...');
              earlyCollectPromises.set(rootDir, deps.collectFiles(candidates, rootDir, config, progressCallback));
            },
          });
          return { rootDir, filePaths: result.filePaths };
        }),
      ),
    );

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

    // Wait for file collection + git operations. If early collection was started
    // via onPreFilterCandidates, it's already in flight; otherwise start it now.
    progressCallback('Collecting files...');
    const [collectResults, gitDiffResult, gitLogResult, emptyDirPaths] = await Promise.all([
      withMemoryLogging(
        'Collect Files',
        async () =>
          await Promise.all(
            sortedFilePathsByDir.map(
              ({ rootDir, filePaths }) =>
                earlyCollectPromises.get(rootDir) ?? deps.collectFiles(filePaths, rootDir, config, progressCallback),
            ),
          ),
      ),
      gitDiffPromise,
      gitLogPromise,
      emptyDirPromise,
    ]);

    // When early collection was used, collected files may include candidates
    // that were later filtered out. Filter per-rootDir to avoid cross-root
    // path aliasing in multi-root scenarios.
    const allRawFiles = collectResults.flatMap((result, i) => {
      const rootDir = sortedFilePathsByDir[i].rootDir;
      if (!earlyCollectPromises.has(rootDir)) return result.rawFiles;
      const allowed = filePathSetByDir.get(rootDir)!;
      return result.rawFiles.filter((f) => allowed.has(f.path));
    });
    const allSkippedFiles = collectResults.flatMap((result, i) => {
      const rootDir = sortedFilePathsByDir[i].rootDir;
      if (!earlyCollectPromises.has(rootDir)) return result.skippedFiles;
      const allowed = filePathSetByDir.get(rootDir)!;
      return result.skippedFiles.filter((f) => allowed.has(f.path));
    });

    // Start security check and file processing concurrently.
    // Security check runs in worker threads (~162ms) while file processing runs
    // on the main thread (~11ms). Instead of waiting for both to complete before
    // starting output generation, we proceed optimistically with ALL files and
    // overlap the security check with output generation + metrics calculation.
    // In the rare case suspicious files are found, we fall back to regenerating
    // output with the filtered file set.
    const securityPromise = withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(allRawFiles, progressCallback, config, gitDiffResult, gitLogResult),
    );

    const allProcessedFiles = await withMemoryLogging('Process Files', async () => {
      progressCallback('Processing files...');
      return deps.processFiles(allRawFiles, config, progressCallback);
    });

    // Pre-sort processedFiles in the same order they will appear in the generated output.
    // `generateOutput` internally calls `sortOutputFiles` as well; both share the same
    // git-log subprocess result (cached via `fileChangeCountsCache`). The array sort itself
    // runs twice but is negligible (~1ms for 1000 files). This ordering is required by the
    // fast-path in `calculateMetrics`, which walks file contents through the output string
    // in order via `extractOutputWrapper`.
    await sortDataPromise;
    const processedFiles = await deps.sortOutputFiles(allProcessedFiles, config);

    progressCallback('Generating output...');

    // Skill generation path — must wait for security check since skill output
    // needs suspicious file results. Metrics not needed, return early.
    if (config.skillGenerate !== undefined && options.skillDir) {
      const validationResult = await securityPromise;
      const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
        validationResult;

      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      const filteredProcessedFiles =
        suspiciousPathSet.size > 0 ? processedFiles.filter((f) => !suspiciousPathSet.has(f.path)) : processedFiles;

      const result = await deps.packSkill({
        rootDirs,
        config,
        options,
        processedFiles: filteredProcessedFiles,
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

    // Await the metrics pool + warmup started at the top of pack(). By now
    // the tinypool import (~34ms), pool creation, and BPE warmup (~300ms)
    // have run concurrently with search + collect + process (~340ms).
    const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = await metricsSetupPromise;

    const produceOutputAndMetrics = async (files: ProcessedFile[]) => {
      const outPromise = deps.produceOutput(
        rootDirs,
        config,
        files,
        allFilePaths,
        gitDiffResult,
        gitLogResult,
        progressCallback,
        filePathsByRoot,
        emptyDirPaths,
      );
      const outForMetrics = outPromise.then((r) => r.outputForMetrics);
      const [outResult, outMetrics] = await Promise.all([
        outPromise,
        withMemoryLogging('Calculate Metrics', () =>
          deps.calculateMetrics(files, outForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
            taskRunner: metricsTaskRunner,
          }),
        ),
      ]);
      // Ensure disk write and clipboard copy are complete before returning
      if (outResult.finalize) {
        await outResult.finalize();
      }
      return { outputFiles: outResult.outputFiles, metrics: outMetrics };
    };

    // Generate and write output, overlapping with metrics calculation AND the
    // security check. The security check (worker threads) runs concurrently —
    // it will be awaited after output+metrics to verify no suspicious files
    // were included.
    //
    // Trade-off: in the rare case where suspicious files are detected, the
    // output file is written once with all files and then overwritten with the
    // filtered set. Since the suspicious content already exists on disk in the
    // repository source files, this transient write does not create new exposure.
    const [outputAndMetrics, validationResult] = await Promise.all([
      produceOutputAndMetrics(processedFiles),
      securityPromise,
    ]);

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    // If suspicious files were found (rare), the output we just generated
    // includes them and must be regenerated with the filtered file set.
    let { outputFiles, metrics } = outputAndMetrics;
    let finalProcessedFiles = processedFiles;

    if (suspiciousFilesResults.length > 0) {
      logger.debug(
        `Security check found ${suspiciousFilesResults.length} suspicious files — regenerating output without them`,
      );
      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      finalProcessedFiles = processedFiles.filter((f) => !suspiciousPathSet.has(f.path));
      ({ outputFiles, metrics } = await produceOutputAndMetrics(finalProcessedFiles));
    }

    const result = {
      ...metrics,
      ...(outputFiles && { outputFiles }),
      suspiciousFilesResults,
      suspiciousGitDiffResults,
      suspiciousGitLogResults,
      processedFiles: finalProcessedFiles,
      safeFilePaths,
      skippedFiles: allSkippedFiles,
    };

    logMemoryUsage('Pack - End');

    return result;
  } finally {
    const setup = await metricsSetupPromise.catch(() => null);
    if (setup) {
      await setup.warmupPromise.catch(() => {});
      await setup.taskRunner.cleanup();
    }
  }
};
