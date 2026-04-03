import fs from 'node:fs/promises';
import path from 'node:path';
import XMLBuilder from 'fast-xml-builder';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { listDirectories, listFiles, searchFiles } from '../file/fileSearch.js';
import { type FilesByRoot, generateTreeString, generateTreeStringWithRoots } from '../file/fileTreeGenerate.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { getLanguageFromFilePath } from './fileLanguageMap.js';
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

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

const calculateMarkdownDelimiter = (files: ReadonlyArray<ProcessedFile>): string => {
  // Fast path: skip files without any backtick sequences (``` or longer).
  // Only files containing ``` need the full char-by-char scan to find the max
  // backtick run length. This skips ~80% of non-markdown/non-code files,
  // reducing scan time from ~13ms to ~3ms for a typical 1000-file repo.
  const threeBackticks = '```';
  let maxBackticks = 0;
  for (const file of files) {
    const { content } = file;
    if (content.indexOf(threeBackticks) === -1) continue;
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

/**
 * Build output string directly without Handlebars template engine.
 * This eliminates the ~25ms Handlebars module import cost and ~10ms rendering overhead
 * by using direct string concatenation with pre-allocated arrays.
 */
const buildXmlOutput = (renderContext: RenderContext): string => {
  const parts: string[] = [];

  if (renderContext.fileSummaryEnabled) {
    parts.push(
      renderContext.generationHeader,
      '\n\n<file_summary>\nThis section contains a summary of this file.\n\n<purpose>\n',
      renderContext.summaryPurpose,
      '\n</purpose>\n\n<file_format>\n',
      renderContext.summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  - File path as an attribute\n  - Full contents of the file\n</file_format>\n\n<usage_guidelines>\n',
      renderContext.summaryUsageGuidelines,
      '\n</usage_guidelines>\n\n<notes>\n',
      renderContext.summaryNotes,
      '\n</notes>\n\n</file_summary>\n\n',
    );
  }

  if (renderContext.headerText) {
    parts.push('<user_provided_header>\n', renderContext.headerText, '\n</user_provided_header>\n\n');
  }

  if (renderContext.directoryStructureEnabled) {
    parts.push('<directory_structure>\n', renderContext.treeString, '\n</directory_structure>\n\n');
  }

  if (renderContext.filesEnabled) {
    parts.push("<files>\nThis section contains the contents of the repository's files.\n\n");
    for (const file of renderContext.processedFiles) {
      parts.push('<file path="', file.path, '">\n', file.content, '\n</file>\n\n');
    }
    parts.push('</files>\n');
  }

  if (renderContext.gitDiffEnabled) {
    parts.push(
      '\n<git_diffs>\n<git_diff_work_tree>\n',
      renderContext.gitDiffWorkTree ?? '',
      '\n</git_diff_work_tree>\n<git_diff_staged>\n',
      renderContext.gitDiffStaged ?? '',
      '\n</git_diff_staged>\n</git_diffs>\n',
    );
  }

  if (renderContext.gitLogEnabled && renderContext.gitLogCommits) {
    parts.push('\n<git_logs>\n');
    for (const commit of renderContext.gitLogCommits) {
      parts.push(
        '<git_log_commit>\n<date>',
        commit.date,
        '</date>\n<message>',
        commit.message,
        '</message>\n<files>\n',
      );
      for (const file of commit.files) {
        parts.push(file, '\n');
      }
      parts.push('</files>\n</git_log_commit>\n');
    }
    parts.push('</git_logs>\n');
  }

  if (renderContext.instruction) {
    parts.push('\n<instruction>\n', renderContext.instruction, '\n</instruction>\n');
  }

  return `${parts.join('').trim()}\n`;
};

const buildMarkdownOutput = (renderContext: RenderContext): string => {
  const parts: string[] = [];
  const delimiter = renderContext.markdownCodeBlockDelimiter;

  if (renderContext.fileSummaryEnabled) {
    parts.push(
      renderContext.generationHeader,
      '\n\n# File Summary\n\n## Purpose\n',
      renderContext.summaryPurpose,
      '\n\n## File Format\n',
      renderContext.summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  a. A header with the file path (## File: path/to/file)\n  b. The full contents of the file in a code block\n\n## Usage Guidelines\n',
      renderContext.summaryUsageGuidelines,
      '\n\n## Notes\n',
      renderContext.summaryNotes,
      '\n\n',
    );
  }

  if (renderContext.headerText) {
    parts.push('# User Provided Header\n', renderContext.headerText, '\n\n');
  }

  if (renderContext.directoryStructureEnabled) {
    parts.push('# Directory Structure\n```\n', renderContext.treeString, '\n```\n\n');
  }

  if (renderContext.filesEnabled) {
    parts.push('# Files\n\n');
    for (const file of renderContext.processedFiles) {
      parts.push(
        '## File: ',
        file.path,
        '\n',
        delimiter,
        getLanguageFromFilePath(file.path),
        '\n',
        file.content,
        '\n',
        delimiter,
        '\n\n',
      );
    }
  }

  if (renderContext.gitDiffEnabled) {
    parts.push(
      '# Git Diffs\n## Git Diffs Working Tree\n```diff\n',
      renderContext.gitDiffWorkTree ?? '',
      '\n```\n\n## Git Diffs Staged\n```diff\n',
      renderContext.gitDiffStaged ?? '',
      '\n```\n\n',
    );
  }

  if (renderContext.gitLogEnabled && renderContext.gitLogCommits) {
    parts.push('# Git Logs\n\n');
    for (const commit of renderContext.gitLogCommits) {
      parts.push('## Commit: ', commit.date, '\n**Message:** ', commit.message, '\n\n**Files:**\n');
      for (const file of commit.files) {
        parts.push('- ', file, '\n');
      }
      parts.push('\n');
    }
  }

  if (renderContext.instruction) {
    parts.push('# Instruction\n', renderContext.instruction, '\n');
  }

  return `${parts.join('').trim()}\n`;
};

const buildPlainOutput = (renderContext: RenderContext): string => {
  const parts: string[] = [];

  if (renderContext.fileSummaryEnabled) {
    parts.push(
      renderContext.generationHeader,
      '\n\n',
      PLAIN_LONG_SEPARATOR,
      '\nFile Summary\n',
      PLAIN_LONG_SEPARATOR,
      '\n\nPurpose:\n--------\n',
      renderContext.summaryPurpose,
      '\n\nFile Format:\n------------\n',
      renderContext.summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  a. A separator line (================)\n  b. The file path (File: path/to/file)\n  c. Another separator line\n  d. The full contents of the file\n  e. A blank line\n\nUsage Guidelines:\n-----------------\n',
      renderContext.summaryUsageGuidelines,
      '\n\nNotes:\n------\n',
      renderContext.summaryNotes,
      '\n\n',
    );
  }

  if (renderContext.headerText) {
    parts.push(
      '\n',
      PLAIN_LONG_SEPARATOR,
      '\nUser Provided Header\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      renderContext.headerText,
      '\n\n',
    );
  }

  if (renderContext.directoryStructureEnabled) {
    parts.push(
      PLAIN_LONG_SEPARATOR,
      '\nDirectory Structure\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      renderContext.treeString,
      '\n\n',
    );
  }

  if (renderContext.filesEnabled) {
    parts.push(PLAIN_LONG_SEPARATOR, '\nFiles\n', PLAIN_LONG_SEPARATOR, '\n\n');
    for (const file of renderContext.processedFiles) {
      parts.push(PLAIN_SEPARATOR, '\nFile: ', file.path, '\n', PLAIN_SEPARATOR, '\n', file.content, '\n\n');
    }
  }

  if (renderContext.gitDiffEnabled) {
    parts.push(
      PLAIN_LONG_SEPARATOR,
      '\nGit Diffs\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      PLAIN_SEPARATOR,
      '\n',
      renderContext.gitDiffWorkTree ?? '',
      '\n',
      PLAIN_SEPARATOR,
      '\n\n',
      PLAIN_SEPARATOR,
      '\nGit Diffs Staged\n',
      PLAIN_SEPARATOR,
      '\n',
      renderContext.gitDiffStaged ?? '',
      '\n\n',
    );
  }

  if (renderContext.gitLogEnabled && renderContext.gitLogCommits) {
    parts.push(PLAIN_LONG_SEPARATOR, '\nGit Logs\n', PLAIN_LONG_SEPARATOR, '\n');
    for (const commit of renderContext.gitLogCommits) {
      parts.push(PLAIN_SEPARATOR, '\nDate: ', commit.date, '\nMessage: ', commit.message, '\nFiles:\n');
      for (const file of commit.files) {
        parts.push('  - ', file, '\n');
      }
      parts.push(PLAIN_SEPARATOR, '\n\n');
    }
    parts.push('\n');
  }

  if (renderContext.instruction) {
    parts.push(PLAIN_LONG_SEPARATOR, '\nInstruction\n', PLAIN_LONG_SEPARATOR, '\n', renderContext.instruction, '\n');
  }

  parts.push('\n', PLAIN_LONG_SEPARATOR, '\nEnd of Codebase\n', PLAIN_LONG_SEPARATOR, '\n');

  return `${parts.join('').trim()}\n`;
};

const generateStringOutput = (
  config: RepomixConfigMerged,
  renderContext: RenderContext,
  processedFiles?: ProcessedFile[],
): string => {
  try {
    switch (config.output.style) {
      case 'xml':
        return buildXmlOutput(renderContext);
      case 'markdown':
        return buildMarkdownOutput(renderContext);
      case 'plain':
        return buildPlainOutput(renderContext);
      default:
        throw new RepomixError(`Unsupported output style: ${config.output.style}`);
    }
  } catch (error) {
    if (error instanceof RangeError && error.message === 'Invalid string length') {
      let largeFilesInfo = '';
      if (processedFiles && processedFiles.length > 0) {
        const topFiles = [...processedFiles]
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
      `Failed to generate output: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    generateStringOutput,
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
        : deps.generateStringOutput(config, renderContext, sortedProcessedFiles);
    case 'json':
      return deps.generateParsableJsonOutput(renderContext);
    case 'markdown':
    case 'plain':
      return deps.generateStringOutput(config, renderContext, sortedProcessedFiles);
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
