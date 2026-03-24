import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { listDirectories, listDirectoriesAndFiles, listFiles, searchFiles } from '../file/fileSearch.js';
import { type FilesByRoot, generateTreeString, generateTreeStringWithRoots } from '../file/fileTreeGenerate.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { OutputGeneratorContext, RenderContext } from './outputGeneratorTypes.js';
import {
  generateHeader,
  generateSummaryFileFormat,
  generateSummaryFileFormatJson,
  generateSummaryNotes,
  generateSummaryPurpose,
  generateSummaryUsageGuidelines,
} from './outputStyleDecorate.js';
import { renderMarkdown } from './outputStyles/markdownStyle.js';
import { renderPlain } from './outputStyles/plainStyle.js';
import { renderXml } from './outputStyles/xmlStyle.js';

/**
 * Single-pass analysis over all file contents to compute both line counts and markdown delimiter.
 * Avoids iterating the files array twice.
 */
const analyzeFileContents = (
  processedFiles: ReadonlyArray<ProcessedFile>,
  outputStyle: string,
): { fileLineCounts: Record<string, number>; markdownCodeBlockDelimiter: string } => {
  const fileLineCounts: Record<string, number> = {};
  let maxBackticks = 0;
  const trackBackticks = outputStyle === 'markdown';

  for (const file of processedFiles) {
    const content = file.content;

    // Count lines
    if (content.length === 0) {
      fileLineCounts[file.path] = 0;
    } else {
      let newlineCount = 0;
      let pos = content.indexOf('\n');
      while (pos !== -1) {
        newlineCount++;
        pos = content.indexOf('\n', pos + 1);
      }
      fileLineCounts[file.path] = content.endsWith('\n') ? newlineCount : newlineCount + 1;
    }

    // Track longest backtick run (only for markdown style).
    // Uses a simple character loop instead of regex to avoid RegExp engine overhead.
    if (trackBackticks) {
      let currentRun = 0;
      for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) === 96) {
          currentRun++;
          if (currentRun > maxBackticks) {
            maxBackticks = currentRun;
          }
        } else {
          currentRun = 0;
        }
      }
    }
  }

  return {
    fileLineCounts,
    markdownCodeBlockDelimiter: '`'.repeat(Math.max(3, maxBackticks + 1)),
  };
};

export const createRenderContext = (outputGeneratorContext: OutputGeneratorContext): RenderContext => {
  const outputStyle = outputGeneratorContext.config.output.style;

  // Only run the full file content analysis when actually needed:
  // - Markdown style needs backtick tracking for code block delimiters
  // - fileLineCounts is only consumed by the skill generation path (not by any renderer)
  // For XML (default), Plain, and JSON styles, skip the O(n) scan over all file content bytes.
  let fileLineCounts: Record<string, number>;
  let markdownCodeBlockDelimiter: string;
  if (outputStyle === 'markdown') {
    const analysis = analyzeFileContents(outputGeneratorContext.processedFiles, outputStyle);
    fileLineCounts = analysis.fileLineCounts;
    markdownCodeBlockDelimiter = analysis.markdownCodeBlockDelimiter;
  } else {
    fileLineCounts = {};
    markdownCodeBlockDelimiter = '```';
  }

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
    fileLineCounts,
    fileSummaryEnabled: outputGeneratorContext.config.output.fileSummary,
    directoryStructureEnabled: outputGeneratorContext.config.output.directoryStructure,
    filesEnabled: outputGeneratorContext.config.output.files,
    escapeFileContent: outputGeneratorContext.config.output.parsableStyle,
    markdownCodeBlockDelimiter,
    gitDiffEnabled: outputGeneratorContext.config.output.git?.includeDiffs,
    gitDiffWorkTree: outputGeneratorContext.gitDiffResult?.workTreeDiffContent,
    gitDiffStaged: outputGeneratorContext.gitDiffResult?.stagedDiffContent,
    gitLogEnabled: outputGeneratorContext.config.output.git?.includeLogs,
    gitLogContent: outputGeneratorContext.gitLogResult?.logContent,
    gitLogCommits: outputGeneratorContext.gitLogResult?.commits,
  };
};

const generateParsableXmlOutput = async (renderContext: RenderContext): Promise<string> => {
  // Lazy-load fast-xml-builder — only needed for parsable XML output,
  // which is not the default style. Avoids ~50KB module load on every run.
  const { default: XMLBuilder } = await import('fast-xml-builder');
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

const generateNativeOutput = async (
  config: RepomixConfigMerged,
  renderContext: RenderContext,
  processedFiles?: ProcessedFile[],
): Promise<string> => {
  try {
    let rendered: string;
    switch (config.output.style) {
      case 'xml':
        rendered = renderXml(renderContext);
        break;
      case 'markdown':
        rendered = renderMarkdown(renderContext);
        break;
      case 'plain':
        rendered = renderPlain(renderContext);
        break;
      default:
        throw new RepomixError(`Unsupported output style: ${config.output.style}`);
    }
    return `${rendered.trim()}\n`;
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
    if (error instanceof RepomixError) {
      throw error;
    }
    throw new RepomixError(
      `Failed to render output: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    generateHandlebarOutput: generateNativeOutput,
    generateParsableXmlOutput,
    generateParsableJsonOutput,
  },
): Promise<string> => {
  // Files are expected to be pre-sorted by the caller (packager.ts)
  // to overlap the git command with metrics computation.
  const outputGeneratorContext = await deps.buildOutputGeneratorContext(
    rootDirs,
    config,
    allFilePaths,
    processedFiles,
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
        : deps.generateHandlebarOutput(config, renderContext, processedFiles);
    case 'json':
      return deps.generateParsableJsonOutput(renderContext);
    case 'markdown':
    case 'plain':
      return deps.generateHandlebarOutput(config, renderContext, processedFiles);
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
    listDirectoriesAndFiles,
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
      // Collect all directories and all files from all roots using the combined function
      // to share prepareIgnoreContext (avoids duplicate .git/info/exclude reads + worktree checks).
      const resultsByRoot = await Promise.all(rootDirs.map((rootDir) => deps.listDirectoriesAndFiles(rootDir, config)));

      // Merge, deduplicate, and sort for deterministic output
      const allDirectories = Array.from(new Set(resultsByRoot.flatMap((r) => r.directories))).sort();
      const allRepoFiles = Array.from(new Set(resultsByRoot.flatMap((r) => r.files)));

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
    // Use pre-computed emptyDirPaths from the initial searchFiles call if available,
    // avoiding a redundant full filesystem scan just to get empty directory paths.
    if (emptyDirPaths && emptyDirPaths.length > 0) {
      directoryPathsForTree = [...new Set(emptyDirPaths)].sort();
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
