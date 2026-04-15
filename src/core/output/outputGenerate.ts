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
import { getLanguageFromFilePath } from './outputLanguageMap.js';
import {
  generateHeader,
  generateSummaryFileFormat,
  generateSummaryFileFormatJson,
  generateSummaryNotes,
  generateSummaryPurpose,
  generateSummaryUsageGuidelines,
} from './outputStyleDecorate.js';

export interface OutputResult {
  output: string;
  outputWrapper: string | null;
}

/**
 * Build the output wrapper (output minus file contents) from the parts array
 * and tracked file content indices. This is O(n) in the number of parts and
 * avoids scanning through the full output string via extractOutputWrapper.
 */
const buildWrapperFromParts = (parts: string[], fileContentIndices: number[]): string => {
  const skipSet = new Set(fileContentIndices);
  const wrapperParts: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (!skipSet.has(i)) {
      wrapperParts.push(parts[i]);
    }
  }
  return `${wrapperParts.join('').trimEnd()}\n`;
};

// Cache for compiled Handlebars templates to avoid recompilation on every call.
// Uses a generic function type so that Handlebars types are not needed at the
// module level (Handlebars is lazy-loaded only when a non-XML style is used).
// biome-ignore lint/suspicious/noExplicitAny: Handlebars template delegates accept any context
const compiledTemplateCache = new Map<string, (context: any) => string>();

// biome-ignore lint/suspicious/noExplicitAny: Handlebars template delegates accept any context
const getCompiledTemplate = async (style: string): Promise<(context: any) => string> => {
  const cached = compiledTemplateCache.get(style);
  if (cached) {
    return cached;
  }

  // Lazy-load Handlebars and the requested template module. This defers the
  // ~27ms Handlebars import cost from every CLI run to only those that actually
  // need Handlebars (markdown, plain, or parsable-XML output). The default XML
  // path uses generateDirectXmlOutput and never reaches this function.
  const [Handlebars, template] = await Promise.all([
    import('handlebars').then((m) => m.default),
    (async () => {
      switch (style) {
        case 'xml': {
          const { getXmlTemplate } = await import('./outputStyles/xmlStyle.js');
          return getXmlTemplate();
        }
        case 'markdown': {
          const { getMarkdownTemplate } = await import('./outputStyles/markdownStyle.js');
          return getMarkdownTemplate();
        }
        case 'plain': {
          const { getPlainTemplate } = await import('./outputStyles/plainStyle.js');
          return getPlainTemplate();
        }
        default:
          throw new RepomixError(`Unsupported output style for handlebars template: ${style}`);
      }
    })(),
  ]);

  const compiled = Handlebars.compile(template);
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

/**
 * Build XML output via direct string concatenation instead of Handlebars.
 *
 * On a ~4 MB output (997 files), Handlebars template execution takes ~250 ms
 * because its compiled template builds the result through many small string
 * concatenations and function calls. Array.push() + join() lets V8 allocate
 * the final string in one shot, finishing in ~15–20 ms (10–15× faster).
 *
 * The output is byte-for-byte identical to the Handlebars XML template.
 * Keep in sync with getXmlTemplate() in outputStyles/xmlStyle.ts.
 */
const generateDirectXmlOutput = (outputGeneratorContext: OutputGeneratorContext): OutputResult => {
  const config = outputGeneratorContext.config;
  const fileSummaryEnabled = config.output.fileSummary;
  const directoryStructureEnabled = config.output.directoryStructure;
  const filesEnabled = config.output.files;
  const gitDiffEnabled = !!config.output.git?.includeDiffs;
  const gitLogEnabled = !!config.output.git?.includeLogs;

  const generationHeader = generateHeader(config, outputGeneratorContext.generationDate);
  const summaryPurpose = generateSummaryPurpose(config);
  const summaryFileFormat = generateSummaryFileFormat();
  const summaryUsageGuidelines = generateSummaryUsageGuidelines(config, outputGeneratorContext.instruction);
  const summaryNotes = generateSummaryNotes(config);

  const parts: string[] = [];
  // Track indices in `parts` that hold file content. After join, these positions
  // are used to build the wrapper string (output minus file content) without
  // scanning through the full output via extractOutputWrapper (~7ms saving).
  const fileContentIndices: number[] = [];

  if (fileSummaryEnabled) {
    parts.push(
      generationHeader,
      '\n\n<file_summary>\nThis section contains a summary of this file.\n\n<purpose>\n',
      summaryPurpose,
      '\n</purpose>\n\n<file_format>\n',
      summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  - File path as an attribute\n  - Full contents of the file\n</file_format>\n\n<usage_guidelines>\n',
      summaryUsageGuidelines,
      '\n</usage_guidelines>\n\n<notes>\n',
      summaryNotes,
      '\n</notes>\n\n</file_summary>\n\n',
    );
  }

  if (config.output.headerText) {
    parts.push('<user_provided_header>\n', config.output.headerText, '\n</user_provided_header>\n\n');
  }

  if (directoryStructureEnabled) {
    parts.push('<directory_structure>\n', outputGeneratorContext.treeString, '\n</directory_structure>\n\n');
  }

  if (filesEnabled) {
    parts.push("<files>\nThis section contains the contents of the repository's files.\n\n");
    for (const file of outputGeneratorContext.processedFiles) {
      parts.push('<file path="', file.path, '">\n');
      fileContentIndices.push(parts.length);
      parts.push(file.content, '\n</file>\n\n');
    }
    parts.push('</files>\n');
  }

  parts.push('\n');

  if (gitDiffEnabled) {
    parts.push(
      '<git_diffs>\n<git_diff_work_tree>\n',
      outputGeneratorContext.gitDiffResult?.workTreeDiffContent ?? '',
      '\n</git_diff_work_tree>\n<git_diff_staged>\n',
      outputGeneratorContext.gitDiffResult?.stagedDiffContent ?? '',
      '\n</git_diff_staged>\n</git_diffs>\n',
    );
  }

  parts.push('\n');

  if (gitLogEnabled) {
    parts.push('<git_logs>\n');
    if (outputGeneratorContext.gitLogResult?.commits) {
      for (const commit of outputGeneratorContext.gitLogResult.commits) {
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

  parts.push('\n');

  if (outputGeneratorContext.instruction) {
    parts.push('<instruction>\n', outputGeneratorContext.instruction, '\n</instruction>\n');
  }

  return {
    output: `${parts.join('').trim()}\n`,
    outputWrapper: fileContentIndices.length > 0 ? buildWrapperFromParts(parts, fileContentIndices) : null,
  };
};

/**
 * Build Markdown output via direct string concatenation instead of Handlebars.
 *
 * Eliminates the ~27ms Handlebars import, ~5ms template compilation, and
 * ~15ms template execution overhead. Array.push() + join() produces output
 * that is byte-for-byte identical to the Handlebars markdown template.
 * Keep in sync with getMarkdownTemplate() in outputStyles/markdownStyle.ts.
 */
const generateDirectMarkdownOutput = (outputGeneratorContext: OutputGeneratorContext): OutputResult => {
  const config = outputGeneratorContext.config;
  const fileSummaryEnabled = config.output.fileSummary;
  const directoryStructureEnabled = config.output.directoryStructure;
  const filesEnabled = config.output.files;
  const gitDiffEnabled = !!config.output.git?.includeDiffs;
  const gitLogEnabled = !!config.output.git?.includeLogs;

  const generationHeader = generateHeader(config, outputGeneratorContext.generationDate);
  const summaryPurpose = generateSummaryPurpose(config);
  const summaryFileFormat = generateSummaryFileFormat();
  const summaryUsageGuidelines = generateSummaryUsageGuidelines(config, outputGeneratorContext.instruction);
  const summaryNotes = generateSummaryNotes(config);

  // Compute markdown code block delimiter only when files are enabled
  const delimiter = filesEnabled ? calculateMarkdownDelimiter(outputGeneratorContext.processedFiles) : '```';

  const parts: string[] = [];
  const fileContentIndices: number[] = [];

  if (fileSummaryEnabled) {
    parts.push(
      generationHeader,
      '\n\n# File Summary\n\n## Purpose\n',
      summaryPurpose,
      '\n\n## File Format\n',
      summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  a. A header with the file path (## File: path/to/file)\n  b. The full contents of the file in a code block\n\n## Usage Guidelines\n',
      summaryUsageGuidelines,
      '\n\n## Notes\n',
      summaryNotes,
      '\n\n',
    );
  }

  if (config.output.headerText) {
    parts.push('# User Provided Header\n', config.output.headerText, '\n\n');
  }

  if (directoryStructureEnabled) {
    parts.push('# Directory Structure\n```\n', outputGeneratorContext.treeString, '\n```\n\n');
  }

  if (filesEnabled) {
    parts.push('# Files\n\n');
    for (const file of outputGeneratorContext.processedFiles) {
      const lang = getLanguageFromFilePath(file.path);
      parts.push(`## File: ${file.path}\n${delimiter}${lang}\n`);
      fileContentIndices.push(parts.length);
      parts.push(file.content, `\n${delimiter}\n\n`);
    }
  }

  parts.push('\n');

  if (gitDiffEnabled) {
    parts.push(
      '# Git Diffs\n## Git Diffs Working Tree\n```diff\n',
      outputGeneratorContext.gitDiffResult?.workTreeDiffContent ?? '',
      '\n```\n\n## Git Diffs Staged\n```diff\n',
      outputGeneratorContext.gitDiffResult?.stagedDiffContent ?? '',
      '\n```\n\n',
    );
  }

  parts.push('\n');

  if (gitLogEnabled) {
    parts.push('# Git Logs\n\n');
    if (outputGeneratorContext.gitLogResult?.commits) {
      for (const commit of outputGeneratorContext.gitLogResult.commits) {
        parts.push('## Commit: ', commit.date, '\n**Message:** ', commit.message, '\n\n**Files:**\n');
        for (const file of commit.files) {
          parts.push('- ', file, '\n');
        }
        parts.push('\n');
      }
    }
  }

  parts.push('\n');

  if (outputGeneratorContext.instruction) {
    parts.push('# Instruction\n', outputGeneratorContext.instruction, '\n');
  }

  return {
    output: `${parts.join('').trim()}\n`,
    outputWrapper: fileContentIndices.length > 0 ? buildWrapperFromParts(parts, fileContentIndices) : null,
  };
};

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

/**
 * Build plain-text output via direct string concatenation instead of Handlebars.
 *
 * Same approach as generateDirectMarkdownOutput — eliminates Handlebars import,
 * compilation, and execution overhead. Output is byte-for-byte identical to
 * the Handlebars plain template.
 * Keep in sync with getPlainTemplate() in outputStyles/plainStyle.ts.
 */
const generateDirectPlainOutput = (outputGeneratorContext: OutputGeneratorContext): OutputResult => {
  const config = outputGeneratorContext.config;
  const fileSummaryEnabled = config.output.fileSummary;
  const directoryStructureEnabled = config.output.directoryStructure;
  const filesEnabled = config.output.files;
  const gitDiffEnabled = !!config.output.git?.includeDiffs;
  const gitLogEnabled = !!config.output.git?.includeLogs;

  const generationHeader = generateHeader(config, outputGeneratorContext.generationDate);
  const summaryPurpose = generateSummaryPurpose(config);
  const summaryFileFormat = generateSummaryFileFormat();
  const summaryUsageGuidelines = generateSummaryUsageGuidelines(config, outputGeneratorContext.instruction);
  const summaryNotes = generateSummaryNotes(config);

  const parts: string[] = [];
  const fileContentIndices: number[] = [];

  if (fileSummaryEnabled) {
    parts.push(
      generationHeader,
      '\n\n',
      PLAIN_LONG_SEPARATOR,
      '\nFile Summary\n',
      PLAIN_LONG_SEPARATOR,
      '\n\nPurpose:\n--------\n',
      summaryPurpose,
      '\n\nFile Format:\n------------\n',
      summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  a. A separator line (================)\n  b. The file path (File: path/to/file)\n  c. Another separator line\n  d. The full contents of the file\n  e. A blank line\n\nUsage Guidelines:\n-----------------\n',
      summaryUsageGuidelines,
      '\n\nNotes:\n------\n',
      summaryNotes,
      '\n\n',
    );
  }

  parts.push('\n');

  if (config.output.headerText) {
    parts.push(
      PLAIN_LONG_SEPARATOR,
      '\nUser Provided Header\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      config.output.headerText,
      '\n\n',
    );
  }

  if (directoryStructureEnabled) {
    parts.push(
      PLAIN_LONG_SEPARATOR,
      '\nDirectory Structure\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      outputGeneratorContext.treeString,
      '\n\n',
    );
  }

  if (filesEnabled) {
    parts.push(PLAIN_LONG_SEPARATOR, '\nFiles\n', PLAIN_LONG_SEPARATOR, '\n\n');
    for (const file of outputGeneratorContext.processedFiles) {
      parts.push(`${PLAIN_SEPARATOR}\nFile: ${file.path}\n${PLAIN_SEPARATOR}\n`);
      fileContentIndices.push(parts.length);
      parts.push(file.content, '\n\n');
    }
  }

  parts.push('\n');

  if (gitDiffEnabled) {
    parts.push(
      PLAIN_LONG_SEPARATOR,
      '\nGit Diffs\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      PLAIN_SEPARATOR,
      '\n',
      outputGeneratorContext.gitDiffResult?.workTreeDiffContent ?? '',
      '\n',
      PLAIN_SEPARATOR,
      '\n\n',
      PLAIN_SEPARATOR,
      '\nGit Diffs Staged\n',
      PLAIN_SEPARATOR,
      '\n',
      outputGeneratorContext.gitDiffResult?.stagedDiffContent ?? '',
      '\n\n',
    );
  }

  parts.push('\n');

  if (gitLogEnabled) {
    parts.push(PLAIN_LONG_SEPARATOR, '\nGit Logs\n', PLAIN_LONG_SEPARATOR, '\n');
    if (outputGeneratorContext.gitLogResult?.commits) {
      for (const commit of outputGeneratorContext.gitLogResult.commits) {
        parts.push(PLAIN_SEPARATOR, '\nDate: ', commit.date, '\nMessage: ', commit.message, '\nFiles:\n');
        for (const file of commit.files) {
          parts.push('  - ', file, '\n');
        }
        parts.push(PLAIN_SEPARATOR, '\n\n');
      }
    }
    parts.push('\n');
  }

  parts.push('\n');

  if (outputGeneratorContext.instruction) {
    parts.push(
      PLAIN_LONG_SEPARATOR,
      '\nInstruction\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      outputGeneratorContext.instruction,
      '\n',
    );
  }

  parts.push('\n');
  parts.push(PLAIN_LONG_SEPARATOR, '\nEnd of Codebase\n', PLAIN_LONG_SEPARATOR, '\n');

  return {
    output: `${parts.join('').trim()}\n`,
    outputWrapper: fileContentIndices.length > 0 ? buildWrapperFromParts(parts, fileContentIndices) : null,
  };
};

const generateHandlebarOutput = async (
  config: RepomixConfigMerged,
  renderContext: RenderContext,
  processedFiles?: ProcessedFile[],
): Promise<string> => {
  try {
    const compiledTemplate = await getCompiledTemplate(config.output.style);
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
    generateDirectXmlOutput,
    generateDirectMarkdownOutput,
    generateDirectPlainOutput,
    generateHandlebarOutput,
    generateParsableXmlOutput,
    generateParsableJsonOutput,
  },
): Promise<OutputResult> => {
  // processedFiles are already sorted by the caller (packager.ts) via
  // sortOutputFiles before invoking produceOutput. Sorting again here would
  // be redundant and waste ~20ms on a cached git-log lookup + O(n log n) sort.
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

  // For non-parsable styles (xml, markdown, plain), use direct string
  // concatenation which is 10–15× faster than Handlebars for large outputs.
  // This path also skips createRenderContext (calculateMarkdownDelimiter,
  // calculateFileLineCounts) which add unnecessary overhead.
  // These generators also return the output wrapper (output minus file content)
  // which allows calculateMetrics to skip the extractOutputWrapper scan.
  if (!config.output.parsableStyle) {
    switch (config.output.style) {
      case 'xml':
        return deps.generateDirectXmlOutput(outputGeneratorContext);
      case 'markdown':
        return deps.generateDirectMarkdownOutput(outputGeneratorContext);
      case 'plain':
        return deps.generateDirectPlainOutput(outputGeneratorContext);
    }
  }

  const renderContext = createRenderContext(outputGeneratorContext);

  let output: string;
  switch (config.output.style) {
    case 'xml':
      output = await deps.generateParsableXmlOutput(renderContext);
      break;
    case 'json':
      output = await deps.generateParsableJsonOutput(renderContext);
      break;
    case 'markdown':
    case 'plain':
      output = await deps.generateHandlebarOutput(config, renderContext, processedFiles);
      break;
    default:
      throw new RepomixError(`Unsupported output style: ${config.output.style}`);
  }
  return { output, outputWrapper: null };
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
