import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { withMemoryLogging } from '../../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { SkippedFileInfo } from '../file/fileCollect.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { calculateMetrics } from '../metrics/calculateMetrics.js';
import { buildOutputGeneratorContext, createRenderContext } from '../output/outputGenerate.js';
import { sortOutputFiles } from '../output/outputSort.js';
import type { PackOptions, PackResult } from '../packager.js';
import type { SuspiciousFileResult } from '../security/securityCheck.js';
import { generateFilesSection, generateStructureSection, generateSummarySection } from './skillSectionGenerators.js';
import { calculateStatistics, generateStatisticsSection } from './skillStatistics.js';
import { generateSkillMd } from './skillStyle.js';
import { detectTechStack, generateTechStackMd } from './skillTechStack.js';
import {
  generateDefaultSkillName,
  generateProjectName,
  generateSkillDescription,
  validateSkillName,
} from './skillUtils.js';
import { writeSkillOutput } from './writeSkillOutput.js';

/**
 * References for skill output - each becomes a separate file
 */
export interface SkillReferences {
  summary: string;
  structure: string;
  files: string;
  techStack?: string;
}

/**
 * Result of skill references generation (without SKILL.md)
 */
export interface SkillReferencesResult {
  references: SkillReferences;
  skillName: string;
  projectName: string;
  skillDescription: string;
  totalFiles: number;
  totalLines: number;
  statisticsSection: string;
  hasTechStack: boolean;
  sourceUrl?: string;
}

/**
 * Result of skill output generation
 */
export interface SkillOutputResult {
  skillMd: string;
  references: SkillReferences;
}

const defaultDeps = {
  buildOutputGeneratorContext,
  sortOutputFiles,
  calculateMetrics,
  writeSkillOutput,
  generateDefaultSkillName,
};

/**
 * Generates skill reference files (summary, structure, files, tech-stack).
 * This is the first step - call this, calculate metrics, then call generateSkillMdFromReferences.
 */
export const generateSkillReferences = async (
  skillName: string,
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  gitDiffResult: GitDiffResult | undefined = undefined,
  gitLogResult: GitLogResult | undefined = undefined,
  skillProjectName?: string,
  skillSourceUrl?: string,
  deps = {
    buildOutputGeneratorContext,
    sortOutputFiles,
  },
): Promise<SkillReferencesResult> => {
  // Validate and normalize skill name
  const normalizedSkillName = validateSkillName(skillName);

  // Use provided project name or generate from root directories
  const projectName = skillProjectName ?? generateProjectName(rootDirs);

  // Generate skill description
  const skillDescription = generateSkillDescription(normalizedSkillName, projectName);

  // Sort processed files by git change count if enabled
  const sortedProcessedFiles = await deps.sortOutputFiles(processedFiles, config);

  // Build output generator context with markdown style
  const markdownConfig: RepomixConfigMerged = {
    ...config,
    output: {
      ...config.output,
      style: 'markdown',
    },
  };

  const outputGeneratorContext = await deps.buildOutputGeneratorContext(
    rootDirs,
    markdownConfig,
    allFilePaths,
    sortedProcessedFiles,
    gitDiffResult,
    gitLogResult,
  );
  const renderContext = createRenderContext(outputGeneratorContext);

  // Calculate statistics
  const statistics = calculateStatistics(sortedProcessedFiles, renderContext.fileLineCounts);
  const statisticsSection = generateStatisticsSection(statistics);

  // Detect tech stack
  const techStack = detectTechStack(sortedProcessedFiles);
  const techStackMd = techStack ? generateTechStackMd(techStack) : undefined;

  // Generate each section separately
  const references: SkillReferences = {
    summary: generateSummarySection(renderContext, statisticsSection),
    structure: generateStructureSection(renderContext),
    files: generateFilesSection(renderContext),
    techStack: techStackMd,
  };

  return {
    references,
    skillName: normalizedSkillName,
    projectName,
    skillDescription,
    totalFiles: sortedProcessedFiles.length,
    totalLines: statistics.totalLines,
    statisticsSection,
    hasTechStack: techStack !== null,
    sourceUrl: skillSourceUrl,
  };
};

/**
 * Generates SKILL.md content from references result and token count.
 * This is the second step - call after calculating metrics.
 */
export const generateSkillMdFromReferences = (
  referencesResult: SkillReferencesResult,
  totalTokens: number,
): SkillOutputResult => {
  const skillMd = generateSkillMd({
    skillName: referencesResult.skillName,
    skillDescription: referencesResult.skillDescription,
    projectName: referencesResult.projectName,
    totalFiles: referencesResult.totalFiles,
    totalLines: referencesResult.totalLines,
    totalTokens,
    hasTechStack: referencesResult.hasTechStack,
    sourceUrl: referencesResult.sourceUrl,
  });

  return {
    skillMd,
    references: referencesResult.references,
  };
};

export interface PackSkillParams {
  rootDirs: string[];
  config: RepomixConfigMerged;
  options: PackOptions;
  processedFiles: ProcessedFile[];
  allFilePaths: string[];
  gitDiffResult: GitDiffResult | undefined;
  gitLogResult: GitLogResult | undefined;
  suspiciousFilesResults: SuspiciousFileResult[];
  suspiciousGitDiffResults: SuspiciousFileResult[];
  suspiciousGitLogResults: SuspiciousFileResult[];
  safeFilePaths: string[];
  skippedFiles: SkippedFileInfo[];
  progressCallback: RepomixProgressCallback;
}

/**
 * Generates skill output (SKILL.md and reference files).
 * This is called from packager.ts when skill generation is requested.
 */
export const packSkill = async (params: PackSkillParams, deps = defaultDeps): Promise<PackResult> => {
  const {
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
    skippedFiles,
    progressCallback,
  } = params;

  // Validate skillDir early to fail fast (before expensive operations)
  const { skillDir } = options;
  if (!skillDir) {
    throw new Error('skillDir is required for skill generation');
  }

  // Use pre-computed skill name or generate from directories
  const skillName =
    options.skillName ??
    (typeof config.skillGenerate === 'string' ? config.skillGenerate : deps.generateDefaultSkillName(rootDirs));

  // Step 1: Generate skill references (summary, structure, files, tech-stack)
  const skillReferencesResult = await withMemoryLogging('Generate Skill References', () =>
    generateSkillReferences(
      skillName,
      rootDirs,
      config,
      processedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      options.skillProjectName,
      options.skillSourceUrl,
      {
        buildOutputGeneratorContext: deps.buildOutputGeneratorContext,
        sortOutputFiles: deps.sortOutputFiles,
      },
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
  const skillOutput = generateSkillMdFromReferences(skillReferencesResult, skillMetrics.totalTokens);

  progressCallback('Writing skill output...');
  await withMemoryLogging('Write Skill Output', () => deps.writeSkillOutput(skillOutput, skillDir));

  return {
    ...skillMetrics,
    suspiciousFilesResults,
    suspiciousGitDiffResults,
    suspiciousGitLogResults,
    processedFiles,
    safeFilePaths,
    skippedFiles,
  };
};
