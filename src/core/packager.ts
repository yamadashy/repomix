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

  // Metrics runner strategy: single worker thread with output token estimation.
  //
  // Output tokenization is always estimated from per-file char/token ratios (<5% error),
  // leaving only ~15 file + 2 git tasks. A single worker thread loads tiktoken WASM
  // (~250ms) in the background during pipeline stages, overlapping initialization with
  // search + collect + security + processing (~225ms). This eliminates the need for
  // multiple workers (each incurring ~250ms WASM loading + CPU contention) and removes
  // the expensive IPC serialization of the 3.7MB output content.
  //
  // On 2-vCPU CI runners, this reduces contention from (2N+1)/2 to 3/2 threads per CPU,
  // improving pipeline throughput during file search and collection.
  const metricsTaskRunner = deps.createMetricsTaskRunner(1);
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.createSecurityTaskRunner(getProcessConcurrency() * 100)
    : undefined;

  // Spawn the single metrics worker before search to overlap tiktoken WASM loading
  // (~250ms) with pipeline stages. Tinypool creates workers lazily on first task.
  const metricsWarmup = metricsTaskRunner
    .run({ content: '', encoding: config.tokenCount.encoding })
    .catch(() => 0) as Promise<number>;
  // Security warmup is fire-and-forget: 1 worker suffices for ~6 pre-filtered files.
  securityTaskRunner?.run({ filePath: 'warmup.txt', content: '', type: 'file' }).catch(() => null);

  // Preload heavy output dependencies in background. For XML non-parsable (default),
  // no preloading is needed — the direct XML renderer avoids Handlebars entirely.
  preloadOutputDeps(config.output.style, config.output.parsableStyle);

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
    // Determine if we need extra commits for sortByChanges beyond the display count.
    // When git logs are enabled, getGitLogs fetches max(displayCount, sortMaxCommits) commits
    // in a single subprocess, eliminating the need for a separate getFileChangeCount call.
    // When git logs are disabled, getFileChangeCount is still needed as a separate subprocess.
    const sortByChanges = config.output.git?.sortByChanges;
    const sortMaxCommits = config.output.git?.sortByChangesMaxCommits ?? 100;
    const logsEnabled = config.output.git?.includeLogs;
    const needsSeparateChangeCount = sortByChanges && !logsEnabled;
    const gitRoot = rootDirs[0] || config.cwd;

    // Run file collection and git operations in parallel since they are independent:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // - getFileChangeCount spawns git log --name-only (only when logs are disabled)
    // When logs are enabled, getGitLogs consolidates both display and sort needs into
    // a single git subprocess, reducing subprocess count from 7 to 4 (with isGitRepository
    // deduplication). This lowers CPU contention during the parallel stage.
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
      deps.getGitLogs(rootDirs, config, sortByChanges ? sortMaxCommits : undefined),
      needsSeparateChangeCount
        ? deps.getFileChangeCount(gitRoot, sortMaxCommits).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Run security check and file processing in parallel.
    // Processing (truncateBase64, removeEmptyLines, trim, showLineNumbers) is independent
    // per file and doesn't depend on security results. By running both concurrently,
    // the shorter stage (process ~28ms) overlaps with the longer stage (security ~40ms),
    // saving ~28ms from the critical path. Suspicious files (~0-5 out of ~1000) are
    // filtered from the processed results after both complete.
    progressCallback('Running security check...');
    const [securityResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, securityTaskRunner),
      ),
      withMemoryLogging('Process Files', () => deps.processFiles(rawFiles, config, progressCallback)),
    ]);

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } = securityResult;

    // Unref security workers so they don't block process exit, but avoid awaiting
    // pool.destroy() which blocks the pipeline for ~100-200ms while terminating threads.
    // Workers will terminate on their own via idle timeout (100ms).
    securityTaskRunner?.unref();

    // Filter out suspicious files from processed results
    const safePathSet = new Set(safeFilePaths);
    const processedFiles = allProcessedFiles.filter((file) => safePathSet.has(file.path));

    progressCallback('Generating output...');

    // Check if skill generation is requested
    if (config.skillGenerate !== undefined && options.skillDir) {
      await metricsWarmup;
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

    // Derive file change counts from git log commits when available.
    // When logs are enabled, getGitLogs already fetched max(displayCount, sortMaxCommits)
    // commits, so we can always derive file change counts from the parsed commits.
    // Falls back to parallelFileChangeCounts when git logs are disabled.
    const canDeriveFromLogs = config.output.git?.sortByChanges && gitLogResult?.commits;
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

    // Submit metrics tasks to the single warm worker while disk write completes.
    // Output tokens are estimated from file char/token ratios, leaving only ~15 file
    // + 2 git tasks. The metricsWarmup promise ensures the worker's tiktoken WASM
    // has loaded before it processes real tasks.
    const [metrics] = await Promise.all([
      withMemoryLogging('Calculate Metrics', () =>
        deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
          taskRunner: metricsTaskRunner,
        }),
      ),
      writeComplete,
      metricsWarmup,
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
