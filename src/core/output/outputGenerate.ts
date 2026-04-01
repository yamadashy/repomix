import fs from 'node:fs/promises';
import path from 'node:path';
import XMLBuilder from 'fast-xml-builder';
import Handlebars from 'handlebars';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { listDirectories, listFiles, searchFiles } from '../file/fileSearch.js';
import { type FilesByRoot, generateTreeString, generateTreeStringWithRoots } from '../file/fileTreeGenerate.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { OutputGeneratorContext, RenderContext } from './outputGeneratorTypes.js';
import { sortOutputFiles } from './outputSort.js';
import {
  generateHeader,
  generateSummaryFileFormat,
  generateSummaryFileFormatJson,
  generateSummaryNotes,
  generateSummaryPurpose,
  generateSummaryUsageGuidelines,
} from './outputStyleDecorate.js';
import { getMarkdownTemplate } from './outputStyles/markdownStyle.js';
import { getPlainTemplate } from './outputStyles/plainStyle.js';
import { getXmlTemplate } from './outputStyles/xmlStyle.js';

// Cache for compiled Handlebars templates to avoid recompilation on every call
const compiledTemplateCache = new Map<string, Handlebars.TemplateDelegate>();

const getCompiledTemplate = (style: string): Handlebars.TemplateDelegate => {
  const cached = compiledTemplateCache.get(style);
  if (cached) {
    return cached;
  }

  let template: string;
  switch (style) {
    case 'xml':
      template = getXmlTemplate();
      break;
    case 'markdown':
      template = getMarkdownTemplate();
      break;
    case 'plain':
      template = getPlainTemplate();
      break;
    default:
      throw new RepomixError(`Unsupported output style for handlebars template: ${style}`);
  }

  const compiled = Handlebars.compile(template);
  compiledTemplateCache.set(style, compiled);
  return compiled;
};

const calculateMarkdownDelimiter = (files: ReadonlyArray<ProcessedFile>): string => {
  let maxBackticks = 0;
  for (const file of files) {
    const { content } = file;
    let seq = 0;
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 96) {
        seq++;
        if (seq > maxBackticks) maxBackticks = seq;
      } else {
        seq = 0;
      }
    }
  }
  return '`'.repeat(Math.max(3, maxBackticks + 1));
};

const calculateFileLineCounts = (processedFiles: ProcessedFile[]): Record<string, number> => {
  const lineCounts: Record<string, number> = {};
  for (const file of processedFiles) {
    const { content } = file;
    if (content.length === 0) {
      lineCounts[file.path] = 0;
    } else {
      let count = 0;
      for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) === 10) count++;
      }
      lineCounts[file.path] = content.charCodeAt(content.length - 1) === 10 ? count : count + 1;
    }
  }
  return lineCounts;
};

export const createRenderContext = (outputGeneratorContext: OutputGeneratorContext): RenderContext => {
  // Use lazy getters for expensive computations that scan all file contents.
  // calculateFileLineCounts (~50ms) is only used by packSkill, not normal CLI output.
  // calculateMarkdownDelimiter (~24ms) is only used by markdown output style.
  let cachedFileLineCounts: Record<string, number> | null = null;
  let cachedMarkdownDelimiter: string | null = null;

  return {
    generationHeader: generateHeader(outputGeneratorContext.config, outputGeneratorContext.generationDate),
    summaryPurpose: generateSummaryPurpose(outputGeneratorContext.config),
    summaryFileFormat: generateSummaryFileFormat(),
    summaryUsageGuidelines: generateSummaryUsageGuidelines(
      outputGeneratorContext.config,
      outputGeneratorContext.instruction,
    ),
    summaryNotes: generateSummaryNotes(outputGeneratorContext.config),
    headerText: outputGeneratorContext.config.output.headerText,
    instruction: outputGeneratorContext.instruction,
    treeString: outputGeneratorContext.treeString,
    processedFiles: outputGeneratorContext.processedFiles,
    get fileLineCounts() {
      if (cachedFileLineCounts === null) {
        cachedFileLineCounts = calculateFileLineCounts(outputGeneratorContext.processedFiles);
      }
      return cachedFileLineCounts;
    },
    fileSummaryEnabled: outputGeneratorContext.config.output.fileSummary,
    directoryStructureEnabled: outputGeneratorContext.config.output.directoryStructure,
    filesEnabled: outputGeneratorContext.config.output.files,
    escapeFileContent: outputGeneratorContext.config.output.parsableStyle,
    get markdownCodeBlockDelimiter() {
      if (cachedMarkdownDelimiter === null) {
        cachedMarkdownDelimiter = calculateMarkdownDelimiter(outputGeneratorContext.processedFiles);
      }
      return cachedMarkdownDelimiter;
    },
    gitDiffEnabled: outputGeneratorContext.config.output.git?.includeDiffs,
    gitDiffWorkTree: outputGeneratorContext.gitDiffResult?.workTreeDiffContent,
    gitDiffStaged: outputGeneratorContext.gitDiffResult?.stagedDiffContent,
    gitLogEnabled: outputGeneratorContext.config.output.git?.includeLogs,
    gitLogContent: outputGeneratorContext.gitLogResult?.logContent,
    gitLogCommits: outputGeneratorContext.gitLogResult?.commits,
  };
};

const generateParsableXmlOutput = async (renderContext: RenderContext): Promise<string> => {
  const xmlBuilder = new XMLBuilder({ ignoreAttributes: false });
  const xmlDocument = {
    repomix: {
      file_summary: renderContext.fileSummaryEnabled
        ? {
            '#text': renderContext.generationHeader,
            purpose: renderContext.summaryPurpose,
            file_format: `${renderContext.summaryFileFormat}
5. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file`,
            usage_guidelines: renderContext.summaryUsageGuidelines,
            notes: renderContext.summaryNotes,
          }
        : undefined,
      user_provided_header: renderContext.headerText,
      directory_structure: renderContext.directoryStructureEnabled ? renderContext.treeString : undefined,
      files: renderContext.filesEnabled
        ? {
            '#text': "This section contains the contents of the repository's files.",
            file: renderContext.processedFiles.map((file) => ({
              '#text': file.content,
              '@_path': file.path,
            })),
          }
        : undefined,
      git_diffs: renderContext.gitDiffEnabled
        ? {
            git_diff_work_tree: renderContext.gitDiffWorkTree,
            git_diff_staged: renderContext.gitDiffStaged,
          }
        : undefined,
      git_logs: renderContext.gitLogEnabled
        ? {
            git_log_commit: renderContext.gitLogCommits?.map((commit) => ({
              date: commit.date,
              message: commit.message,
              files: commit.files.map((file) => ({ '#text': file })),
            })),
          }
        : undefined,
      instruction: renderContext.instruction ? renderContext.instruction : undefined,
    },
  };
  try {
    return xmlBuilder.build(xmlDocument);
  } catch (error) {
    throw new RepomixError(
      `Failed to generate XML output: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
};

const generateParsableJsonOutput = async (renderContext: RenderContext): Promise<string> => {
  const jsonDocument = {
    ...(renderContext.fileSummaryEnabled && {
      fileSummary: {
        generationHeader: renderContext.generationHeader,
        purpose: renderContext.summaryPurpose,
        fileFormat: generateSummaryFileFormatJson(),
        usageGuidelines: renderContext.summaryUsageGuidelines,
        notes: renderContext.summaryNotes,
      },
    }),
    ...(renderContext.headerText && {
      userProvidedHeader: renderContext.headerText,
    }),
    ...(renderContext.directoryStructureEnabled && {
      directoryStructure: renderContext.treeString,
    }),
    ...(renderContext.filesEnabled && {
      files: renderContext.processedFiles.reduce(
        (acc, file) => {
          acc[file.path] = file.content;
          return acc;
        },
        {} as Record<string, string>,
      ),
    }),
    ...(renderContext.gitDiffEnabled && {
      gitDiffs: {
        workTree: renderContext.gitDiffWorkTree,
        staged: renderContext.gitDiffStaged,
      },
    }),
    ...(renderContext.gitLogEnabled && {
      gitLogs: renderContext.gitLogCommits?.map((commit) => ({
        date: commit.date,
        message: commit.message,
        files: commit.files,
      })),
    }),
    ...(renderContext.instruction && {
      instruction: renderContext.instruction,
    }),
  };

  try {
    return JSON.stringify(jsonDocument, null, 2);
  } catch (error) {
    throw new RepomixError(
      `Failed to generate JSON output: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
};

const generateHandlebarOutput = async (
  config: RepomixConfigMerged,
  renderContext: RenderContext,
  processedFiles?: ProcessedFile[],
): Promise<string> => {
  try {
    const compiledTemplate = getCompiledTemplate(config.output.style);
    return `${compiledTemplate(renderContext).trim()}\n`;
  } catch (error) {
    if (error instanceof RangeError && error.message === 'Invalid string length') {
      let largeFilesInfo = '';
      if (processedFiles && processedFiles.length > 0) {
        const topFiles = processedFiles
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, 5)
          .map((f) => `  - ${f.path} (${(f.content.length / 1024 / 1024).toFixed(1)} MB)`)
          .join('\n');
        largeFilesInfo = `\n\nLargest files in this repository:\n${topFiles}`;
      }

      throw new RepomixError(
        `Output size exceeds JavaScript string limit. The repository contains files that are too large to process.
Please try:
  - Use --ignore to exclude large files (e.g., --ignore "docs/**" or --ignore "*.html")
  - Use --include to process only specific files
  - Process smaller portions of the repository at a time${largeFilesInfo}`,
        { cause: error },
      );
    }
    throw new RepomixError(
      `Failed to compile template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
};

export const generateOutput = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  gitDiffResult: GitDiffResult | undefined = undefined,
  gitLogResult: GitLogResult | undefined = undefined,
  filePathsByRoot?: FilesByRoot[],
  emptyDirPaths?: string[],
  deps = {
    buildOutputGeneratorContext,
    generateHandlebarOutput,
    generateParsableXmlOutput,
    generateParsableJsonOutput,
    sortOutputFiles,
  },
): Promise<string> => {
  // Sort processed files by git change count if enabled
  const sortedProcessedFiles = await deps.sortOutputFiles(processedFiles, config);

  const outputGeneratorContext = await deps.buildOutputGeneratorContext(
    rootDirs,
    config,
    allFilePaths,
    sortedProcessedFiles,
    gitDiffResult,
    gitLogResult,
    filePathsByRoot,
    emptyDirPaths,
  );
  const renderContext = createRenderContext(outputGeneratorContext);

  switch (config.output.style) {
    case 'xml':
      return config.output.parsableStyle
        ? deps.generateParsableXmlOutput(renderContext)
        : deps.generateHandlebarOutput(config, renderContext, sortedProcessedFiles);
    case 'json':
      return deps.generateParsableJsonOutput(renderContext);
    case 'markdown':
    case 'plain':
      return deps.generateHandlebarOutput(config, renderContext, sortedProcessedFiles);
    default:
      throw new RepomixError(`Unsupported output style: ${config.output.style}`);
  }
};

export const buildOutputGeneratorContext = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  allFilePaths: string[],
  processedFiles: ProcessedFile[],
  gitDiffResult: GitDiffResult | undefined = undefined,
  gitLogResult: GitLogResult | undefined = undefined,
  filePathsByRoot?: FilesByRoot[],
  emptyDirPaths?: string[],
  deps = {
    listDirectories,
    listFiles,
    searchFiles,
  },
): Promise<OutputGeneratorContext> => {
  let repositoryInstruction = '';

  if (config.output.instructionFilePath) {
    const instructionPath = path.resolve(config.cwd, config.output.instructionFilePath);
    try {
      repositoryInstruction = await fs.readFile(instructionPath, 'utf-8');
    } catch {
      throw new RepomixError(`Instruction file not found at ${instructionPath}`);
    }
  }

  // Determine if full-tree mode applies (only when directory structure is rendered)
  const shouldUseFullTree =
    config.output.directoryStructure === true &&
    !!config.output.includeFullDirectoryStructure &&
    (config.include?.length ?? 0) > 0;

  // Paths to include in the directory tree visualization
  let directoryPathsForTree: string[] = [];
  let filePathsForTree: string[] = allFilePaths;

  if (shouldUseFullTree) {
    try {
      // Collect all directories and all files from all roots
      const [allDirectoriesByRoot, allFilesByRoot] = await Promise.all([
        Promise.all(rootDirs.map((rootDir) => deps.listDirectories(rootDir, config))),
        Promise.all(rootDirs.map((rootDir) => deps.listFiles(rootDir, config))),
      ]);

      // Merge, deduplicate, and sort for deterministic output
      const allDirectories = Array.from(new Set(allDirectoriesByRoot.flat())).sort();
      const allRepoFiles = Array.from(new Set(allFilesByRoot.flat()));

      // Merge in any files that weren't part of the included files so they appear in the tree
      const includedSet = new Set(allFilePaths);
      const additionalFiles = allRepoFiles.filter((p) => !includedSet.has(p));

      directoryPathsForTree = allDirectories;
      // additionalFiles is already disjoint from allFilePaths (filtered above), so no dedup needed
      filePathsForTree = allFilePaths.concat(additionalFiles);
    } catch (error) {
      throw new RepomixError(
        `Failed to build full directory structure: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  } else if (config.output.directoryStructure && config.output.includeEmptyDirectories) {
    // Reuse pre-computed emptyDirPaths from the initial searchFiles call when available,
    // avoiding a redundant full directory scan.
    if (emptyDirPaths) {
      directoryPathsForTree = emptyDirPaths;
    } else {
      try {
        const results = await Promise.all(rootDirs.map((rootDir) => deps.searchFiles(rootDir, config)));
        const merged = results.flatMap((r) => r.emptyDirPaths);
        directoryPathsForTree = [...new Set(merged)].sort();
      } catch (error) {
        throw new RepomixError(
          `Failed to search for empty directories: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? { cause: error } : undefined,
        );
      }
    }
  }

  // Generate tree string - use multi-root format if filePathsByRoot is provided
  // generateTreeStringWithRoots handles single root case internally
  let treeString: string;
  if (filePathsByRoot) {
    treeString = generateTreeStringWithRoots(filePathsByRoot, directoryPathsForTree);
  } else {
    // Fallback for when root info is not available
    treeString = generateTreeString(filePathsForTree, directoryPathsForTree);
  }

  return {
    generationDate: new Date().toISOString(),
    treeString,
    processedFiles,
    config,
    instruction: repositoryInstruction,
    gitDiffResult,
    gitLogResult,
  };
};
