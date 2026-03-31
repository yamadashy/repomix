import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
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

// Lazy-load handlebars and fast-xml-builder to save ~22ms from the startup critical path.
// These modules are loaded on first use during output generation, which runs after
// file search (~175ms) + collection (~56ms) + security (~369ms) + processing (~56ms).
// A preload mechanism (preloadOutputDeps) allows loading them during file search for zero cost.
const esmRequire = createRequire(import.meta.url);
// biome-ignore lint/suspicious/noExplicitAny: CJS interop - module shape varies between ESM default and CJS exports
let _Handlebars: any;
// biome-ignore lint/suspicious/noExplicitAny: CJS interop - fast-xml-builder exports vary by environment
let _XMLBuilder: any;
const getHandlebars = () => {
  if (!_Handlebars) {
    const mod = esmRequire('handlebars');
    _Handlebars = mod.default || mod;
  }
  return _Handlebars;
};
const getXMLBuilder = () => {
  if (!_XMLBuilder) {
    const mod = esmRequire('fast-xml-builder');
    _XMLBuilder = mod.default || mod;
  }
  return _XMLBuilder;
};

/**
 * Preload heavy dependencies during an idle event loop tick.
 * Call this at the start of the pipeline so modules are loaded during file search I/O
 * rather than during output generation's critical path.
 *
 * For XML non-parsable output (the default), Handlebars is not needed — the direct
 * XML renderer uses array.join() string construction. Skipping the Handlebars preload
 * saves ~18ms of event loop blocking during file search and ~30ms of template
 * compilation that would otherwise occur during output generation.
 */
export const preloadOutputDeps = (style?: string, parsableStyle?: boolean): void => {
  // Schedule sync require for the next idle tick. During file search,
  // the main thread is mostly idle (waiting for globby I/O), giving us
  // free time to load these modules without affecting the critical path.
  const needsHandlebars = style === 'markdown' || style === 'plain';
  const needsXMLBuilder = style === 'xml' && !!parsableStyle;

  // Skip preloading entirely when neither module is needed (xml non-parsable default).
  if (!needsHandlebars && !needsXMLBuilder) {
    return;
  }

  setImmediate(() => {
    try {
      if (needsHandlebars) {
        getHandlebars();
      }
      if (needsXMLBuilder) {
        getXMLBuilder();
      }
    } catch {
      // Intentionally ignored - will fail with proper context at use site
    }
  });
};

// Cache for compiled Handlebars templates to avoid recompilation on every call
const compiledTemplateCache = new Map<string, HandlebarsTemplateDelegate>();

type HandlebarsTemplateDelegate = (context: unknown, options?: unknown) => string;

const getCompiledTemplate = (style: string): HandlebarsTemplateDelegate => {
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

  const compiled = getHandlebars().compile(template);
  compiledTemplateCache.set(style, compiled);
  return compiled;
};

// Single-pass scan: counts newlines and tracks max consecutive backticks simultaneously.
// Avoids two separate iterations over all file content. Each character is visited exactly once
// to compute both line counts (for file summary) and markdown delimiter length.
const calculateFileLineCountsAndDelimiter = (
  processedFiles: ReadonlyArray<ProcessedFile>,
  options: { needsLineCounts: boolean; needsDelimiter: boolean } = { needsLineCounts: true, needsDelimiter: true },
): { lineCounts: Record<string, number>; markdownDelimiter: string } => {
  // Skip the expensive content scan entirely when neither line counts nor delimiter are needed.
  // For XML/JSON output (the default), this saves ~10ms by avoiding a full scan of ~3.6MB of content.
  // Line counts are only used by skill generation (packSkill.ts), and the markdown delimiter
  // is only used by markdown/plain style templates.
  if (!options.needsLineCounts && !options.needsDelimiter) {
    return { lineCounts: {}, markdownDelimiter: '```' };
  }

  const lineCounts: Record<string, number> = {};
  let globalMaxBackticks = 0;

  for (const file of processedFiles) {
    const content = file.content;
    if (content.length === 0) {
      if (options.needsLineCounts) {
        lineCounts[file.path] = 0;
      }
      continue;
    }

    let newlineCount = 0;
    let currentBackticks = 0;
    let maxBackticks = 0;

    for (let i = 0; i < content.length; i++) {
      const ch = content.charCodeAt(i);
      if (ch === 10) {
        // newline
        newlineCount++;
        currentBackticks = 0;
      } else if (ch === 96) {
        // backtick
        currentBackticks++;
        if (currentBackticks > maxBackticks) {
          maxBackticks = currentBackticks;
        }
      } else {
        currentBackticks = 0;
      }
    }

    if (options.needsLineCounts) {
      lineCounts[file.path] = content.charCodeAt(content.length - 1) === 10 ? newlineCount : newlineCount + 1;
    }

    if (maxBackticks > globalMaxBackticks) {
      globalMaxBackticks = maxBackticks;
    }
  }

  return {
    lineCounts,
    markdownDelimiter: '`'.repeat(Math.max(3, globalMaxBackticks + 1)),
  };
};

/**
 * Create a render context from the output generator context.
 *
 * @param options.needsLineCounts - Whether to compute per-file line counts.
 *   Only needed by skill generation (packSkill → calculateStatistics).
 *   Normal output templates (xml, markdown, plain, json) never reference fileLineCounts.
 *   When false AND output style is xml/json, the entire ~3.6MB content scan is skipped (~10ms savings).
 */
export const createRenderContext = (
  outputGeneratorContext: OutputGeneratorContext,
  options: { needsLineCounts?: boolean } = {},
): RenderContext => {
  const style = outputGeneratorContext.config.output.style;
  const needsDelimiter = style === 'markdown' || style === 'plain';
  const needsLineCounts = options.needsLineCounts ?? false;
  const { lineCounts, markdownDelimiter } = calculateFileLineCountsAndDelimiter(outputGeneratorContext.processedFiles, {
    needsLineCounts,
    needsDelimiter,
  });

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
    fileLineCounts: lineCounts,
    fileSummaryEnabled: outputGeneratorContext.config.output.fileSummary,
    directoryStructureEnabled: outputGeneratorContext.config.output.directoryStructure,
    filesEnabled: outputGeneratorContext.config.output.files,
    escapeFileContent: outputGeneratorContext.config.output.parsableStyle,
    markdownCodeBlockDelimiter: markdownDelimiter,
    gitDiffEnabled: outputGeneratorContext.config.output.git?.includeDiffs,
    gitDiffWorkTree: outputGeneratorContext.gitDiffResult?.workTreeDiffContent,
    gitDiffStaged: outputGeneratorContext.gitDiffResult?.stagedDiffContent,
    gitLogEnabled: outputGeneratorContext.config.output.git?.includeLogs,
    gitLogContent: outputGeneratorContext.gitLogResult?.logContent,
    // Truncate commits to the configured display count. When sortByChanges is enabled,
    // gitLogResult.commits may contain more commits than includeLogsCount (fetched for
    // sorting purposes). Only the configured display count should appear in the output.
    gitLogCommits: outputGeneratorContext.gitLogResult?.commits?.slice(
      0,
      outputGeneratorContext.config.output.git?.includeLogsCount ?? 50,
    ),
  };
};

/**
 * Direct XML renderer that bypasses Handlebars for the non-parsable XML style.
 *
 * Produces output identical to the Handlebars XML template but avoids:
 * - Handlebars module load (~18ms)
 * - Template compilation (~30ms on first call)
 * - Handlebars interpreter overhead (~5ms per render)
 *
 * Uses array accumulator with join() for O(n) string construction.
 * This is the default output path (style=xml, parsableStyle=false).
 */
const generateDirectXmlOutput = (renderContext: RenderContext): string => {
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

  if (renderContext.gitLogEnabled) {
    parts.push('\n<git_logs>\n');
    if (renderContext.gitLogCommits) {
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
    }
    parts.push('</git_logs>\n');
  }

  if (renderContext.instruction) {
    parts.push('\n<instruction>\n', renderContext.instruction, '\n</instruction>\n');
  }

  return `${parts.join('').trim()}\n`;
};

const generateParsableXmlOutput = async (renderContext: RenderContext): Promise<string> => {
  const XmlBuilderModule = getXMLBuilder();
  const xmlBuilder = new XmlBuilderModule({ ignoreAttributes: false });
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
  preComputedFileChangeCounts?: Record<string, number>,
  deps = {
    buildOutputGeneratorContext,
    generateDirectXmlOutput,
    generateHandlebarOutput,
    generateParsableXmlOutput,
    generateParsableJsonOutput,
    sortOutputFiles,
  },
): Promise<string> => {
  // Sort processed files by git change count if enabled
  const sortedProcessedFiles = await deps.sortOutputFiles(
    processedFiles,
    config,
    undefined,
    preComputedFileChangeCounts,
  );

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
      if (config.output.parsableStyle) {
        return deps.generateParsableXmlOutput(renderContext);
      }
      // Direct XML renderer bypasses Handlebars entirely, saving ~50ms of module load +
      // template compilation on the default code path. Handlebars is only loaded when
      // actually needed (markdown, plain styles).
      return deps.generateDirectXmlOutput(renderContext);
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
