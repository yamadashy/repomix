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
import { generateOutput, generateSkillMdFromReferences, generateSkillReferences } from './output/outputGenerate.js';
import { generateDefaultSkillName } from './output/skill/skillUtils.js';
import { copyToClipboardIfEnabled } from './packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from './packager/writeOutputToDisk.js';
import { writeSkillOutput } from './packager/writeSkillOutput.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';

export interface PackResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
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
  generateSkillReferences,
  generateSkillMdFromReferences,
  generateDefaultSkillName,
  validateFileSafety,
  writeOutputToDisk,
  writeSkillOutput,
  copyToClipboardIfEnabled,
  calculateMetrics,
  sortPaths,
  getGitDiffs,
  getGitLogs,
};

export const pack = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  overrideDeps: Partial<typeof defaultDeps> = {},
  explicitFiles?: string[],
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

  let output: string;

  // Check if skill generation is requested
  if (config.skillGenerate !== undefined) {
    // Resolve skill name: use provided name or auto-generate
    const skillName =
      typeof config.skillGenerate === 'string'
        ? config.skillGenerate
        : deps.generateDefaultSkillName(rootDirs, config.remoteUrl);

    // Step 1: Generate skill references (summary, structure, files, git-diffs, git-logs)
    const skillReferencesResult = await withMemoryLogging('Generate Skill References', () =>
      deps.generateSkillReferences(
        skillName,
        rootDirs,
        config,
        processedFiles,
        allFilePaths,
        gitDiffResult,
        gitLogResult,
      ),
    );

    // Step 2: Calculate metrics from files section to get accurate token count
    const skillMetrics = await withMemoryLogging('Calculate Skill Metrics', () =>
      deps.calculateMetrics(
        processedFiles,
        skillReferencesResult.references.files,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
      ),
    );

    // Step 3: Generate SKILL.md with accurate token count
    const skillOutput = deps.generateSkillMdFromReferences(skillReferencesResult, skillMetrics.totalTokens);

    progressCallback('Writing skill output...');
    await withMemoryLogging('Write Skill Output', () =>
      deps.writeSkillOutput(skillOutput, skillReferencesResult.skillName, config.cwd),
    );

    // Use files section for final metrics (most representative of content size)
    output = skillOutput.references.files;
  } else {
    output = await withMemoryLogging('Generate Output', () =>
      deps.generateOutput(rootDirs, config, processedFiles, allFilePaths, gitDiffResult, gitLogResult),
    );

    progressCallback('Writing output file...');
    await withMemoryLogging('Write Output', () => deps.writeOutputToDisk(output, config));

    await deps.copyToClipboardIfEnabled(output, progressCallback, config);
  }

  const metrics = await withMemoryLogging('Calculate Metrics', () =>
    deps.calculateMetrics(processedFiles, output, progressCallback, config, gitDiffResult, gitLogResult),
  );

  // Create a result object that includes metrics and security results
  const result = {
    ...metrics,
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
