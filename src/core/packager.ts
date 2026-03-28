import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { getProcessConcurrency } from '../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { processFiles } from './file/fileProcess.js';
import { searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import type { GitLogCommit } from './git/gitLogHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { getFileChangeCount } from './git/gitRepositoryHandle.js';
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { preloadOutputDeps } from './output/outputGenerate.js';
import { produceOutput } from './packager/produceOutput.js';
import { createSecurityTaskRunner, type SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';

/**
 * Derive file change counts from already-fetched git log commits.
 * This avoids spawning a separate `git log --name-only` subprocess during output generation
 * by reusing the commit data from getGitLogs which already includes file lists.
 */
const deriveFileChangeCounts = (commits: GitLogCommit[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const commit of commits) {
    for (const file of commit.files) {
      counts[file] = (counts[file] || 0) + 1;
    }
  }
  return counts;
};

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
  createSecurityTaskRunner,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  getFileChangeCount,
  packSkill: async (...args: Parameters<typeof import('./skill/packSkill.js').packSkill>) => {
    const { packSkill } = await import('./skill/packSkill.js');
    return packSkill(...args);
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

  // Pre-initialize metrics worker pool immediately to maximize tiktoken WASM warmup overlap.
  // Tiktoken initialization takes ~240ms in the worker thread. By starting it here (before
  // file search), the WASM loading overlaps with search (~140ms) + collection (~40ms) +
  // processing + output generation, eliminating the warmup gap from the critical path.
  // Use processConcurrency as the initial thread estimate; Tinypool handles the sizing.
  const concurrency = getProcessConcurrency();
  const metricsTaskRunner = deps.createMetricsTaskRunner(concurrency * 100);

  // Send concurrent warmup tasks to pre-initialize ALL worker threads with tiktoken WASM.
  // Tinypool spawns workers lazily, so a single warmup task only warms 1 of N threads.
  // Sending N tasks forces all N workers to spawn and load tiktoken (~240ms each) in
  // parallel during file search + collection + security + processing (~300ms total),
  // so all workers are ready when metrics calculation begins.
  // The 5s idle timeout (see processConcurrency.ts) ensures warm threads survive the
  // pipeline stages between warmup and metrics.
  const warmupPromise = Promise.all(
    Array.from({ length: concurrency }, () =>
      metricsTaskRunner.run({ content: '', encoding: config.tokenCount.encoding }).catch(() => 0),
    ),
  );

  // Preload heavy output dependencies (handlebars, fast-xml-builder) in background.
  // These load during file search (~175ms) and are cached before output generation.
  preloadOutputDeps();

  // Pre-initialize security worker pool before file search to maximize warmup overlap.
  // Secretlint module loading takes ~150ms in the worker thread. By starting it here,
  // the module loading overlaps with file search (~300ms), so the worker is fully
  // initialized by the time security check tasks arrive after file collection.
  // Previously this was created after search, giving only ~50ms of overlap (collection time).
  // Use a conservative task estimate; Tinypool creates workers lazily based on actual demand.
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.createSecurityTaskRunner(concurrency * 100)
    : undefined;

  const _securityWarmupPromise = securityTaskRunner
    ?.run({ filePath: 'warmup.txt', content: '', type: 'file' })
    .catch(() => null);

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );

  const filePathsByDir = searchResultsByDir.map(({ rootDir, filePaths }) => ({ rootDir, filePaths }));
  // Deduplicate and sort empty directory paths for reuse during output generation,
  // avoiding a redundant searchFiles call in buildOutputGeneratorContext.
  const emptyDirPaths = [...new Set(searchResultsByDir.flatMap((r) => r.emptyDirPaths))].sort();

  // Sort file paths
  progressCallback('Sorting files...');
  const allFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths);
  const sortedFilePaths = deps.sortPaths(allFilePaths);

  // Regroup sorted file paths by rootDir using Set for O(1) membership checks
  const filePathSetByDir = new Map(filePathsByDir.map(({ rootDir, filePaths }) => [rootDir, new Set(filePaths)]));
  const sortedFilePathsByDir = rootDirs.map((rootDir) => ({
    rootDir,
    filePaths: sortedFilePaths.filter((filePath) => filePathSetByDir.get(rootDir)?.has(filePath) ?? false),
  }));

  try {
    // Pre-compute file change counts in parallel when we can't derive from git log commits.
    // Derivation requires includeLogsCount >= sortByChangesMaxCommits (defaults: 50 vs 100),
    // so the parallel fetch is needed in most default configurations.
    const sortByChanges = config.output.git?.sortByChanges;
    const logsEnabled = config.output.git?.includeLogs;
    const logsHaveEnoughCommits =
      logsEnabled && (config.output.git?.includeLogsCount ?? 50) >= (config.output.git?.sortByChangesMaxCommits ?? 100);
    const needsParallelChangeCount = sortByChanges && !logsHaveEnoughCommits;
    const gitRoot = rootDirs[0] || config.cwd;

    // Run file collection and git operations in parallel since they are independent:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // - getFileChangeCount spawns git log --name-only (only when logs are disabled)
    // Neither depends on the other's results.
    progressCallback('Collecting files...');
    const [collectResults, gitDiffResult, gitLogResult, parallelFileChangeCounts] = await Promise.all([
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
      needsParallelChangeCount
        ? deps.getFileChangeCount(gitRoot, config.output.git?.sortByChangesMaxCommits).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Run security check and get filtered safe files
    const { safeFilePaths, safeRawFiles, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      await withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, securityTaskRunner),
      );

    // Unref security workers so they don't block process exit, but avoid awaiting
    // pool.destroy() which blocks the pipeline for ~100-200ms while terminating threads.
    // Workers will terminate on their own via idle timeout (100ms).
    securityTaskRunner?.unref();

    // Process files (remove comments, etc.)
    progressCallback('Processing files...');
    const processedFiles = await withMemoryLogging('Process Files', () =>
      deps.processFiles(safeRawFiles, config, progressCallback),
    );

    progressCallback('Generating output...');

    // Check if skill generation is requested
    if (config.skillGenerate !== undefined && options.skillDir) {
      // Await warmup to ensure graceful worker shutdown (avoid terminating WASM-loading thread)
      await warmupPromise;

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

    // Derive file change counts from git log commits to avoid spawning a separate
    // git subprocess during output generation. The git log data already includes
    // per-commit file lists, so we can count changes without an additional process.
    // Only derive when includeLogsCount >= sortByChangesMaxCommits, otherwise the
    // log data contains fewer commits than the sort needs (defaults: 50 vs 100).
    // Falls back to parallelFileChangeCounts when git logs are disabled or insufficient.
    const sortMaxCommits = config.output.git?.sortByChangesMaxCommits ?? 100;
    const logCommitCount = config.output.git?.includeLogsCount ?? 50;
    const canDeriveFromLogs =
      config.output.git?.sortByChanges && gitLogResult?.commits && logCommitCount >= sortMaxCommits;
    const preComputedFileChangeCounts = canDeriveFromLogs
      ? deriveFileChangeCounts(gitLogResult.commits)
      : parallelFileChangeCounts;

    // Generate and write output (handles both single and split output)
    const { outputFiles, outputForMetrics, writeComplete } = await deps.produceOutput(
      rootDirs,
      config,
      processedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      progressCallback,
      filePathsByRoot,
      emptyDirPaths,
      {},
      preComputedFileChangeCounts,
    );

    // Ensure warm-up task completes before metrics calculation
    await warmupPromise;

    // Run metrics calculation in parallel with disk write / clipboard copy
    const [metrics] = await Promise.all([
      withMemoryLogging('Calculate Metrics', () =>
        deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
          taskRunner: metricsTaskRunner,
        }),
      ),
      writeComplete,
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

    logMemoryUsage('Pack - End');

    return result;
  } finally {
    // Unref worker threads so they don't prevent process exit.
    // This saves ~89ms by allowing the CLI process to terminate immediately
    // after reporting results, without waiting for worker thread destruction.
    // For MCP/server mode, the pool is pre-created externally (deps.taskRunner)
    // and cleaned up by the caller, so this path is not reached.
    metricsTaskRunner.unref();
  }
};
