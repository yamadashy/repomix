import fs from 'node:fs/promises';
import path from 'node:path';
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
import { getHandlebars, registerHandlebarsHelpers } from './outputStyleUtils.js';

type CompiledTemplate = ReturnType<typeof import('handlebars')['compile']>;

// Cache for compiled Handlebars templates to avoid recompilation on every call
const compiledTemplateCache = new Map<string, CompiledTemplate>();

const getCompiledTemplate = (style: string): CompiledTemplate => {
  const cached = compiledTemplateCache.get(style);
  if (cached) {
    return cached;
  }

  // Ensure shared Handlebars helpers are registered before compiling. This was
  // previously triggered by a module-load side effect in markdownStyle.ts; it
  // now runs here so loading the style modules no longer forces Handlebars onto
  // the startup path.
  registerHandlebarsHelpers();

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

  const compiled = getHandlebars().compile(template);
  compiledTemplateCache.set(style, compiled);
  return compiled;
};

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
  const processedFiles = outputGeneratorContext.processedFiles;

  // `fileLineCounts` and `markdownCodeBlockDelimiter` each require a full scan of
  // every file's content, but they are only consumed by the markdown template and
  // the skill path. The default xml/plain/json render paths never read them, so we
  // expose them as lazily-computed, memoized getters: the scan runs at most once,
  // and only when a consumer actually accesses the property. This keeps the values
  // byte-identical while removing the work from the common xml/plain/json paths.
  let cachedFileLineCounts: Record<string, number> | undefined;
  let cachedMarkdownCodeBlockDelimiter: string | undefined;

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
    processedFiles,
    get fileLineCounts(): Record<string, number> {
      cachedFileLineCounts ??= calculateFileLineCounts(processedFiles);
      return cachedFileLineCounts;
    },
    fileSummaryEnabled: outputGeneratorContext.config.output.fileSummary,
    directoryStructureEnabled: outputGeneratorContext.config.output.directoryStructure,
    filesEnabled: outputGeneratorContext.config.output.files,
    escapeFileContent: outputGeneratorContext.config.output.parsableStyle,
    get markdownCodeBlockDelimiter(): string {
      cachedMarkdownCodeBlockDelimiter ??= calculateMarkdownDelimiter(processedFiles);
      return cachedMarkdownCodeBlockDelimiter;
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
  // Lazy-load fast-xml-builder (~3ms) — only used for parsable XML output (non-default)
  const FastXmlBuilder = (await import('fast-xml-builder')).default;
  const xmlBuilder = new FastXmlBuilder({ ignoreAttributes: false });
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

// Wrap a too-large-output RangeError ("Invalid string length", thrown when the
// final string exceeds V8's max length) in an actionable RepomixError listing the
// largest files. Shared by the Handlebars and the direct XML builder so both paths
// surface the identical guidance. Returns undefined for any other error so callers
// can apply their own fallback handling.
const createOutputSizeExceededError = (error: unknown, processedFiles?: ProcessedFile[]): RepomixError | undefined => {
  if (!(error instanceof RangeError && error.message === 'Invalid string length')) {
    return undefined;
  }
  let largeFilesInfo = '';
  if (processedFiles && processedFiles.length > 0) {
    const topFiles = [...processedFiles]
      .sort((a, b) => b.content.length - a.content.length)
      .slice(0, 5)
      .map((f) => `  - ${f.path} (${(f.content.length / 1024 / 1024).toFixed(1)} MB)`)
      .join('\n');
    largeFilesInfo = `\n\nLargest files in this repository:\n${topFiles}`;
  }

  return new RepomixError(
    `Output size exceeds JavaScript string limit. The repository contains files that are too large to process.
Please try:
  - Use --ignore to exclude large files (e.g., --ignore "docs/**" or --ignore "*.html")
  - Use --include to process only specific files
  - Process smaller portions of the repository at a time${largeFilesInfo}`,
    { cause: error },
  );
};

// Build the non-parsable XML output by direct string concatenation. This mirrors
// `getXmlTemplate()` exactly (verified byte-identical across the file-summary /
// header / directory-structure / files / git-diff / git-log / instruction
// toggles), but skips the Handlebars runtime, whose per-property lookups and
// per-file `{{#each}}` iteration dominated the output-generation phase on the
// default xml path (~19ms → ~7ms on this repo). Only the default xml style uses
// this; parsable XML and JSON have their own builders, and markdown/plain stay on
// Handlebars.
const generateXmlOutput = (renderContext: RenderContext, processedFiles?: ProcessedFile[]): string => {
  const rc = renderContext;
  const parts: string[] = [];

  if (rc.fileSummaryEnabled) {
    parts.push(rc.generationHeader, '\n\n');
    parts.push('<file_summary>\nThis section contains a summary of this file.\n\n');
    parts.push('<purpose>\n', rc.summaryPurpose, '\n</purpose>\n\n');
    parts.push(
      '<file_format>\n',
      rc.summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  - File path as an attribute\n  - Full contents of the file\n</file_format>\n\n',
    );
    parts.push('<usage_guidelines>\n', rc.summaryUsageGuidelines, '\n</usage_guidelines>\n\n');
    parts.push('<notes>\n', rc.summaryNotes, '\n</notes>\n\n');
    parts.push('</file_summary>\n\n');
  }

  if (rc.headerText) {
    parts.push('<user_provided_header>\n', rc.headerText, '\n</user_provided_header>\n\n');
  }

  if (rc.directoryStructureEnabled) {
    parts.push('<directory_structure>\n', rc.treeString, '\n</directory_structure>\n\n');
  }

  if (rc.filesEnabled) {
    parts.push("<files>\nThis section contains the contents of the repository's files.\n\n");
    for (const file of rc.processedFiles) {
      parts.push('<file path="', file.path, '">\n', file.content, '\n</file>\n\n');
    }
    parts.push('</files>\n');
  }

  parts.push('\n');

  if (rc.gitDiffEnabled) {
    parts.push(
      '<git_diffs>\n<git_diff_work_tree>\n',
      rc.gitDiffWorkTree ?? '',
      '\n</git_diff_work_tree>\n<git_diff_staged>\n',
      rc.gitDiffStaged ?? '',
      '\n</git_diff_staged>\n</git_diffs>\n',
    );
  }

  parts.push('\n');

  if (rc.gitLogEnabled) {
    parts.push('<git_logs>\n');
    for (const commit of rc.gitLogCommits ?? []) {
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

  parts.push('\n');

  if (rc.instruction) {
    parts.push('<instruction>\n', rc.instruction, '\n</instruction>\n');
  }

  try {
    return `${parts.join('').trim()}\n`;
  } catch (error) {
    throw (
      createOutputSizeExceededError(error, processedFiles) ??
      new RepomixError(
        `Failed to generate XML output: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? { cause: error } : undefined,
      )
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
    throw (
      createOutputSizeExceededError(error, processedFiles) ??
      new RepomixError(
        `Failed to compile template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? { cause: error } : undefined,
      )
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
    generateXmlOutput,
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
        : deps.generateXmlOutput(renderContext, sortedProcessedFiles);
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
