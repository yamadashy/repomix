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

const calculateMarkdownDelimiter = (files: ReadonlyArray<ProcessedFile>): string => {
  const maxBackticks = files
    .flatMap((file) => file.content.match(/`+/g) ?? [])
    .reduce((max, match) => Math.max(max, match.length), 0);
  return '`'.repeat(Math.max(3, maxBackticks + 1));
};

const calculateFileLineCounts = (processedFiles: ProcessedFile[]): Record<string, number> => {
  const lineCounts: Record<string, number> = {};
  for (const file of processedFiles) {
    // Count lines: empty files have 0 lines, otherwise count newlines + 1
    // (unless the content ends with a newline, in which case the last "line" is empty)
    const content = file.content;
    if (content.length === 0) {
      lineCounts[file.path] = 0;
    } else {
      // Count actual lines (text editor style: number of \n + 1, but trailing \n doesn't add extra line)
      const newlineCount = (content.match(/\n/g) || []).length;
      lineCounts[file.path] = content.endsWith('\n') ? newlineCount : newlineCount + 1;
    }
  }
  return lineCounts;
};

export const createRenderContext = (outputGeneratorContext: OutputGeneratorContext): RenderContext => {
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
    fileLineCounts: calculateFileLineCounts(outputGeneratorContext.processedFiles),
    fileSummaryEnabled: outputGeneratorContext.config.output.fileSummary,
    directoryStructureEnabled: outputGeneratorContext.config.output.directoryStructure,
    filesEnabled: outputGeneratorContext.config.output.files,
    escapeFileContent: outputGeneratorContext.config.output.parsableStyle,
    markdownCodeBlockDelimiter: calculateMarkdownDelimiter(outputGeneratorContext.processedFiles),
    gitDiffEnabled: outputGeneratorContext.config.output.git?.includeDiffs,
    gitDiffWorkTree: outputGeneratorContext.gitDiffResult?.workTreeDiffContent,
    gitDiffStaged: outputGeneratorContext.gitDiffResult?.stagedDiffContent,
    gitLogEnabled: outputGeneratorContext.config.output.git?.includeLogs,
    gitLogContent: outputGeneratorContext.gitLogResult?.logContent,
    gitLogCommits: outputGeneratorContext.gitLogResult?.commits,
  };
};

// Direct string builder for XML style output (replaces Handlebars template)
const buildXmlOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}\n\n<file_summary>\nThis section contains a summary of this file.\n\n<purpose>\n${ctx.summaryPurpose}\n</purpose>\n\n<file_format>\n${ctx.summaryFileFormat}\n5. Multiple file entries, each consisting of:\n  - File path as an attribute\n  - Full contents of the file\n</file_format>\n\n<usage_guidelines>\n${ctx.summaryUsageGuidelines}\n</usage_guidelines>\n\n<notes>\n${ctx.summaryNotes}\n</notes>\n\n</file_summary>\n\n`,
    );
  }

  if (ctx.headerText) {
    parts.push(`<user_provided_header>\n${ctx.headerText}\n</user_provided_header>\n\n`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`<directory_structure>\n${ctx.treeString}\n</directory_structure>\n\n`);
  }

  if (ctx.filesEnabled) {
    parts.push("<files>\nThis section contains the contents of the repository's files.\n");
    for (const file of ctx.processedFiles) {
      parts.push(`\n<file path="${file.path}">\n${file.content}\n</file>\n`);
    }
    parts.push('\n</files>\n');
  }

  if (ctx.gitDiffEnabled) {
    parts.push(
      `\n<git_diffs>\n<git_diff_work_tree>\n${ctx.gitDiffWorkTree}\n</git_diff_work_tree>\n<git_diff_staged>\n${ctx.gitDiffStaged}\n</git_diff_staged>\n</git_diffs>\n`,
    );
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push('\n<git_logs>');
    for (const commit of ctx.gitLogCommits) {
      parts.push(`\n<git_log_commit>\n<date>${commit.date}</date>\n<message>${commit.message}</message>\n<files>`);
      for (const file of commit.files) {
        parts.push(`\n${file}`);
      }
      parts.push('\n</files>\n</git_log_commit>');
    }
    parts.push('\n</git_logs>\n');
  }

  if (ctx.instruction) {
    parts.push(`\n<instruction>\n${ctx.instruction}\n</instruction>`);
  }

  return parts.join('');
};

// Direct string builder for Markdown style output (replaces Handlebars template)
const buildMarkdownOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}\n\n# File Summary\n\n## Purpose\n${ctx.summaryPurpose}\n\n## File Format\n${ctx.summaryFileFormat}\n5. Multiple file entries, each consisting of:\n  a. A header with the file path (## File: path/to/file)\n  b. The full contents of the file in a code block\n\n## Usage Guidelines\n${ctx.summaryUsageGuidelines}\n\n## Notes\n${ctx.summaryNotes}\n\n`,
    );
  }

  if (ctx.headerText) {
    parts.push(`# User Provided Header\n${ctx.headerText}\n\n`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`# Directory Structure\n\`\`\`\n${ctx.treeString}\n\`\`\`\n\n`);
  }

  if (ctx.filesEnabled) {
    const delim = ctx.markdownCodeBlockDelimiter;
    parts.push('# Files\n\n');
    for (const file of ctx.processedFiles) {
      const lang = getLanguageFromFilePath(file.path);
      parts.push(`## File: ${file.path}\n${delim}${lang}\n${file.content}\n${delim}\n\n`);
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push(
      `# Git Diffs\n## Git Diffs Working Tree\n\`\`\`diff\n${ctx.gitDiffWorkTree}\n\`\`\`\n\n## Git Diffs Staged\n\`\`\`diff\n${ctx.gitDiffStaged}\n\`\`\`\n\n`,
    );
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push('# Git Logs\n\n');
    for (const commit of ctx.gitLogCommits) {
      parts.push(`## Commit: ${commit.date}\n**Message:** ${commit.message}\n\n**Files:**\n`);
      for (const file of commit.files) {
        parts.push(`- ${file}\n`);
      }
      parts.push('\n');
    }
  }

  if (ctx.instruction) {
    parts.push(`# Instruction\n${ctx.instruction}`);
  }

  return parts.join('');
};

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

// Direct string builder for Plain text style output (replaces Handlebars template)
const buildPlainOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}\n\n${PLAIN_LONG_SEPARATOR}\nFile Summary\n${PLAIN_LONG_SEPARATOR}\n\nPurpose:\n--------\n${ctx.summaryPurpose}\n\nFile Format:\n------------\n${ctx.summaryFileFormat}\n5. Multiple file entries, each consisting of:\n  a. A separator line (================)\n  b. The file path (File: path/to/file)\n  c. Another separator line\n  d. The full contents of the file\n  e. A blank line\n\nUsage Guidelines:\n-----------------\n${ctx.summaryUsageGuidelines}\n\nNotes:\n------\n${ctx.summaryNotes}\n\n`,
    );
  }

  if (ctx.headerText) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nUser Provided Header\n${PLAIN_LONG_SEPARATOR}\n${ctx.headerText}\n\n`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\nDirectory Structure\n${PLAIN_LONG_SEPARATOR}\n${ctx.treeString}\n\n`);
  }

  if (ctx.filesEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\nFiles\n${PLAIN_LONG_SEPARATOR}\n\n`);
    for (const file of ctx.processedFiles) {
      parts.push(`${PLAIN_SEPARATOR}\nFile: ${file.path}\n${PLAIN_SEPARATOR}\n${file.content}\n\n`);
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push(
      `${PLAIN_LONG_SEPARATOR}\nGit Diffs\n${PLAIN_LONG_SEPARATOR}\n${PLAIN_SEPARATOR}\n${ctx.gitDiffWorkTree}\n${PLAIN_SEPARATOR}\n\n${PLAIN_SEPARATOR}\nGit Diffs Staged\n${PLAIN_SEPARATOR}\n${ctx.gitDiffStaged}\n\n`,
    );
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\nGit Logs\n${PLAIN_LONG_SEPARATOR}\n`);
    for (const commit of ctx.gitLogCommits) {
      parts.push(`${PLAIN_SEPARATOR}\nDate: ${commit.date}\nMessage: ${commit.message}\nFiles:\n`);
      for (const file of commit.files) {
        parts.push(`  - ${file}\n`);
      }
      parts.push(`${PLAIN_SEPARATOR}\n\n`);
    }
    parts.push('\n');
  }

  if (ctx.instruction) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\nInstruction\n${PLAIN_LONG_SEPARATOR}\n${ctx.instruction}`);
  }

  parts.push(`\n${PLAIN_LONG_SEPARATOR}\nEnd of Codebase\n${PLAIN_LONG_SEPARATOR}\n`);

  return parts.join('');
};

const generateDirectOutput = async (
  config: RepomixConfigMerged,
  renderContext: RenderContext,
  processedFiles?: ProcessedFile[],
): Promise<string> => {
  try {
    let output: string;
    switch (config.output.style) {
      case 'xml':
        output = buildXmlOutput(renderContext);
        break;
      case 'markdown':
        output = buildMarkdownOutput(renderContext);
        break;
      case 'plain':
        output = buildPlainOutput(renderContext);
        break;
      default:
        throw new RepomixError(`Unsupported output style: ${config.output.style}`);
    }
    return `${output.trim()}\n`;
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
      `Failed to generate output: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
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

export const generateOutput = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  gitDiffResult: GitDiffResult | undefined = undefined,
  gitLogResult: GitLogResult | undefined = undefined,
  filePathsByRoot?: FilesByRoot[],
  deps = {
    buildOutputGeneratorContext,
    generateDirectOutput,
    generateParsableXmlOutput,
    generateParsableJsonOutput,
    sortOutputFiles,
  },
  emptyDirPaths?: string[],
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
    undefined,
    emptyDirPaths,
  );
  const renderContext = createRenderContext(outputGeneratorContext);

  switch (config.output.style) {
    case 'xml':
      return config.output.parsableStyle
        ? deps.generateParsableXmlOutput(renderContext)
        : deps.generateDirectOutput(config, renderContext, sortedProcessedFiles);
    case 'json':
      return deps.generateParsableJsonOutput(renderContext);
    case 'markdown':
    case 'plain':
      return deps.generateDirectOutput(config, renderContext, sortedProcessedFiles);
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
  deps = {
    listDirectories,
    listFiles,
    searchFiles,
  },
  emptyDirPaths?: string[],
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
    // Use pre-computed emptyDirPaths from the initial file search if available,
    // avoiding a redundant searchFiles call (~86-163ms saved)
    if (emptyDirPaths !== undefined) {
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
