import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { processFiles } from './file/fileProcess.js';
import { searchFiles } from './file/fileSearch.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateMetrics } from './metrics/calculateMetrics.js';
import { generateOutput } from './output/outputGenerate.js';
import { generateSplitOutputParts } from './output/outputSplit.js';
import { copyToClipboardIfEnabled } from './packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from './packager/writeOutputToDisk.js';
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
  generateOutput,
  validateFileSafety,
  writeOutputToDisk,
  copyToClipboardIfEnabled,
  calculateMetrics,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  packSkill,
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

  progressCallback('Searching for files...');
  const filePathsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => ({
        rootDir,
        filePaths: (await deps.searchFiles(rootDir, config, explicitFiles)).filePaths,
      })),
    ),
  );

  // Sort file paths
  progressCallback('Sorting files...');
  const allFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths);
  const sortedFilePaths = deps.sortPaths(allFilePaths);

  // Regroup sorted file paths by rootDir
  const sortedFilePathsByDir = rootDirs.map((rootDir) => ({
    rootDir,
    filePaths: sortedFilePaths.filter((filePath: string) =>
      filePathsByDir.find((item) => item.rootDir === rootDir)?.filePaths.includes(filePath),
    ),
  }));

  progressCallback('Collecting files...');
  const collectResults = await withMemoryLogging(
    'Collect Files',
    async () =>
      await Promise.all(
        sortedFilePathsByDir.map(({ rootDir, filePaths }) =>
          deps.collectFiles(filePaths, rootDir, config, progressCallback),
        ),
      ),
  );

  const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
  const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

  // Get git diffs if enabled - run this before security check
  progressCallback('Getting git diffs...');
  const gitDiffResult = await deps.getGitDiffs(rootDirs, config);

  // Get git logs if enabled - run this before security check
  progressCallback('Getting git logs...');
  const gitLogResult = await deps.getGitLogs(rootDirs, config);

  // Run security check and get filtered safe files
  const { safeFilePaths, safeRawFiles, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
    await withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
    );

  // Process files (remove comments, etc.)
  progressCallback('Processing files...');
  const processedFiles = await withMemoryLogging('Process Files', () =>
    deps.processFiles(safeRawFiles, config, progressCallback),
  );

  progressCallback('Generating output...');

  // Check if skill generation is requested
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

  // Normal output generation
  const splitMaxBytes = config.output.splitOutput;
  let outputFiles: string[] | undefined;
  let outputForMetrics: string | string[];

  if (splitMaxBytes !== undefined) {
    const parts = await withMemoryLogging('Generate Split Output', async () => {
      return await generateSplitOutputParts({
        rootDirs,
        baseConfig: config,
        processedFiles,
        allFilePaths,
        maxBytesPerPart: splitMaxBytes,
        gitDiffResult,
        gitLogResult,
        progressCallback,
        deps: {
          generateOutput: deps.generateOutput,
        },
      });
    });

    progressCallback('Writing output files...');
    await withMemoryLogging('Write Split Output', async () => {
      for (const part of parts) {
        const partConfig = {
          ...config,
          output: {
            ...config.output,
            stdout: false,
            filePath: part.filePath,
          },
        };
        // eslint-disable-next-line no-await-in-loop
        await deps.writeOutputToDisk(part.content, partConfig);
      }
    });

    outputFiles = parts.map((p) => p.filePath);
    outputForMetrics = parts.map((p) => p.content);
  } else {
    const output = await withMemoryLogging('Generate Output', () =>
      deps.generateOutput(rootDirs, config, processedFiles, allFilePaths, gitDiffResult, gitLogResult),
    );

    progressCallback('Writing output file...');
    await withMemoryLogging('Write Output', () => deps.writeOutputToDisk(output, config));

    await deps.copyToClipboardIfEnabled(output, progressCallback, config);
    outputForMetrics = output;
  }

  const metrics = await withMemoryLogging('Calculate Metrics', () =>
    deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult),
  );

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
};
