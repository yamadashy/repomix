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
import {
  calculateMetrics,
  createMetricsTaskRunner,
  isMetricsWarmLikely,
  METRICS_EAGER_PREWARM_TASKS,
} from './metrics/calculateMetrics.js';
import { contentCacheKey, loadTokenCountCache, saveTokenCountCache } from './metrics/tokenCountCache.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import { buildRootLabels, joinDisplayPath } from './packager/rootDisplayPath.js';
import { createSecurityCheckTaskRunner, type SuspiciousFileResult } from './security/securityCheck.js';
import { loadSecurityResultCache, saveSecurityResultCache } from './security/securityResultCache.js';
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
  createSecurityCheckTaskRunner,
  isMetricsWarmLikely,
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

  // Load the security-result cache in the background too, so a warm run can skip
  // the secretlint engine for files whose content (and the secretlint rule
  // version) are unchanged. Same overlap rationale as the token-count cache:
  // started here, it is ready by the time the security check reads it. Only when
  // the security check is enabled; otherwise no security work runs at all.
  const securityCacheLoadPromise = config.security.enableSecurityCheck ? loadSecurityResultCache() : undefined;

  // Pre-fetch git file-change counts for sortOutputFiles while search and
  // collection are in flight, so the later sortOutputFiles call is a cache hit.
  const sortDataPromise = deps.prefetchSortData(config).catch((error) => {
    logger.trace('Failed to prefetch sort data:', error);
  });

  // Pre-create and warm the security-check worker pool at the very start of
  // pack(), so secretlint's ~75ms per-thread module load overlaps the whole
  // file-search and collection window instead of landing cold in front of the
  // first security batch (which sits on the serial critical path: its results
  // gate the processed-file filtering and output ordering). Created only when
  // the security check is actually enabled; otherwise validateFileSafety never
  // runs it. The pool's worker count is bounded by MAX_SECURITY_WORKERS inside
  // createSecurityCheckTaskRunner, identical to the lazy path.
  const securityCheck = config.security.enableSecurityCheck ? deps.createSecurityCheckTaskRunner() : undefined;

  // Declared before the try so the finally block can clean these worker pools up
  // even if an error (e.g. a searchFiles failure) unwinds pack() before the
  // metrics pool is created. The security pool is created above, so the try must
  // cover everything from here on to guarantee its cleanup as well.
  let metricsTaskRunner: ReturnType<typeof createMetricsTaskRunner>['taskRunner'] | undefined;
  let metricsWarmupPromise: ReturnType<typeof createMetricsTaskRunner>['warmupPromise'] | undefined;

  // Eagerly create the metrics worker pool here, at pack() start, when this
  // repo's token-count cache is already populated (the "warm-likely" path). The
  // pool's warm-up loads gpt-tokenizer (~220ms: worker spawn + the multi-MB
  // BPE-ranks parse) and is awaited just before output generation. Created at its
  // original site — after file search — that ~220ms warm-up has only the collect
  // and security window to overlap and resolves ~30ms after the await, blocking
  // the critical-path tail. Starting it here gives the warm-up the full search +
  // collect + security window, hiding it entirely.
  //
  // Restricted to the warm-likely path because there the eager warm-up count is a
  // fixed single worker (METRICS_WARM_LIKELY_PREWARM), independent of the file
  // count — so the pool can be created before the count is known without changing
  // how many workers warm up. On the cold path the warm-up count scales with the
  // file count (to overlap every worker's BPE parse), which is not known until
  // after search, so that path keeps creating the pool below, unchanged.
  // `METRICS_EAGER_PREWARM_TASKS` only sets the pool's max-thread cap; a warm run
  // dispatches at most a couple of git tokenizations, so the cap is never reached
  // and the pool behaves identically to a file-count-sized one.
  if (deps.isMetricsWarmLikely(rootDirs)) {
    ({ taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
      rootDirs,
      METRICS_EAGER_PREWARM_TASKS,
      config.tokenCount.encoding,
    ));
  }

  try {
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
    const sortedFilePathsByDir = searchResultsByDir.map(({ rootDir, filePaths }) => ({
      rootDir,
      filePaths: deps.sortPaths([...new Set(filePaths)]),
    }));
    const rootLabels = rootDirs.length > 1 ? buildRootLabels(rootDirs, config.cwd) : undefined;
    const displayFilePathsByDir = sortedFilePathsByDir.map(({ rootDir, filePaths }, index) => {
      const rootLabel = rootLabels?.[index];
      return {
        rootDir,
        filePaths: rootLabel ? filePaths.map((filePath) => joinDisplayPath(rootLabel, filePath)) : filePaths,
      };
    });
    const allFilePaths = displayFilePathsByDir.flatMap(({ filePaths }) => filePaths);

    // Pre-initialize metrics worker pool to overlap gpt-tokenizer loading with subsequent pipeline stages
    // (security check, file processing, output generation). `rootDirs` flows into the warm-up sizing so
    // a per-repo "seen" marker can switch between cold (full warm-up) and warm-likely (single worker).
    // On the warm-likely path the pool was already created eagerly at pack() start (see above), so this
    // only runs on the cold path, where the warm-up count needs the now-known file count.
    if (metricsTaskRunner === undefined) {
      ({ taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
        rootDirs,
        allFilePaths.length,
        config.tokenCount.encoding,
      ));
    }

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
      const rootLabel = rootLabels?.[index];
      return curr.rawFiles.map((file) => ({
        ...file,
        path: rootLabel ? joinDisplayPath(rootLabel, file.path) : file.path,
      }));
    });
    const allSkippedFiles = collectResults.flatMap((curr, index) => {
      const rootLabel = rootLabels?.[index];
      return curr.skippedFiles.map((file) => ({
        ...file,
        path: rootLabel ? joinDisplayPath(rootLabel, file.path) : file.path,
      }));
    });

    // Ensure the security-result cache is loaded before the security check reads
    // it. Started at pack() start, it is typically already resolved; this await
    // is a safety net so the cache lookups inside validateFileSafety see a
    // populated cache on warm runs.
    await securityCacheLoadPromise;

    // Run security check and file processing concurrently.
    // Security check uses worker threads while file processing runs on the main thread
    // (in the default non-compress/non-removeComments config), so they don't compete for CPU.
    // After both complete, filter out any suspicious files from the processed results.
    const [validationResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(
          rawFiles,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          undefined,
          securityCheck?.taskRunner,
        ),
      ),
      withMemoryLogging('Process Files', async () => {
        progressCallback('Processing files...');
        const processed = await deps.processFiles(rawFiles, config, progressCallback);
        // Precompute the per-file token-count cache keys now, while the security
        // worker pool is still scanning and the main thread would otherwise sit
        // idle awaiting it. This moves the per-file MD5 hashing off the later
        // metrics critical path (where `calculateFileMetrics` runs concurrently
        // with output generation, both contending for the main thread) into a
        // window where it overlaps the secretlint workers for free. The keys are
        // identical to what `calculateFileMetrics` would compute, so token counts
        // and output are unchanged.
        //
        // Gated on `enableSecurityCheck`: without the security worker pool there
        // is no idle window to hide the hashing behind, so this arm resolves as
        // soon as `processFiles` finishes and the hashing would instead land
        // serially in front of output generation — a net regression on a warm
        // cache. In that case we leave the hashing where it was, in
        // `calculateFileMetrics` (overlapping output generation). Also skipped on
        // the skill-generate path, which returns before metrics reads the keys.
        if (config.skillGenerate === undefined && config.security.enableSecurityCheck) {
          const encoding = config.tokenCount.encoding;
          for (const file of processed) {
            file.tokenCacheKey = contentCacheKey(encoding, file.content);
          }
        }
        return processed;
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
    const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }, index) => ({
      rootLabel: rootLabels?.[index] ?? (path.basename(rootDir) || rootDir),
      files: filePaths,
    }));

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

    // Persist the security-result cache likewise, so verdicts computed this run
    // can be replayed next time. No-op when the cache is unchanged or disabled.
    await saveSecurityResultCache();

    logMemoryUsage('Pack - End');

    return result;
  } finally {
    if (metricsWarmupPromise !== undefined) await metricsWarmupPromise.catch(() => {});
    if (metricsTaskRunner !== undefined) await metricsTaskRunner.cleanup();
    if (securityCheck !== undefined) {
      await securityCheck.warmupPromise.catch(() => {});
      await securityCheck.taskRunner.cleanup();
    }
  }
};
