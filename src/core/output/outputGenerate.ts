import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLBuilder } from 'fast-xml-parser';
import Handlebars from 'handlebars';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { type FileSearchResult, searchFiles } from '../file/fileSearch.js';
import { generateTreeString } from '../file/fileTreeGenerate.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { OutputGeneratorContext, RenderContext } from './outputGeneratorTypes.js';
import { sortOutputFiles } from './outputSort.js';
import {
  generateHeader,
  generateSummaryFileFormat,
  generateSummaryNotes,
  generateSummaryPurpose,
  generateSummaryUsageGuidelines,
} from './outputStyleDecorate.js';
import { getMarkdownTemplate } from './outputStyles/markdownStyle.js';
import { getPlainTemplate } from './outputStyles/plainStyle.js';
import { getXmlTemplate } from './outputStyles/xmlStyle.js';

const calculateMarkdownDelimiter = (files: ReadonlyArray<ProcessedFile>): string => {
  const maxBackticks = files
    .flatMap((file) => file.content.match(/`+/g) ?? [])
    .reduce((max, match) => Math.max(max, match.length), 0);
  return '`'.repeat(Math.max(3, maxBackticks + 1));
};

const createRenderContext = (outputGeneratorContext: OutputGeneratorContext): RenderContext => {
  return {
    generationHeader: generateHeader(outputGeneratorContext.config, outputGeneratorContext.generationDate), // configを追加
    summaryPurpose: generateSummaryPurpose(),
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
    fileSummaryEnabled: outputGeneratorContext.config.output.fileSummary,
    directoryStructureEnabled: outputGeneratorContext.config.output.directoryStructure,
    escapeFileContent: outputGeneratorContext.config.output.parsableStyle,
    markdownCodeBlockDelimiter: calculateMarkdownDelimiter(outputGeneratorContext.processedFiles),
  };
};

const generateParsableXmlOutput = async (renderContext: RenderContext): Promise<string> => {
  const xmlBuilder = new XMLBuilder({ ignoreAttributes: false });
  const xmlDocument = {
    repomix: {
      '#text': renderContext.generationHeader,
      file_summary: renderContext.fileSummaryEnabled
        ? {
            '#text': 'This section contains a summary of this file.',
            purpose: renderContext.summaryPurpose,
            file_format: `${renderContext.summaryFileFormat}
4. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file`,
            usage_guidelines: renderContext.summaryUsageGuidelines,
            notes: renderContext.summaryNotes,
            additional_info: {
              user_provided_header: renderContext.headerText,
            },
          }
        : undefined,
      directory_structure: renderContext.directoryStructureEnabled ? renderContext.treeString : undefined,
      files: {
        '#text': "This section contains the contents of the repository's files.",
        file: renderContext.processedFiles.map((file) => ({
          '#text': file.content,
          '@_path': file.path,
        })),
      },
      instruction: renderContext.instruction ? renderContext.instruction : undefined,
    },
  };
  try {
    return xmlBuilder.build(xmlDocument);
  } catch (error) {
    throw new RepomixError(
      `Failed to generate XML output: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

const generateHandlebarOutput = async (config: RepomixConfigMerged, renderContext: RenderContext): Promise<string> => {
  let template: string;
  switch (config.output.style) {
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
      throw new RepomixError(`Unknown output style: ${config.output.style}`);
  }

  try {
    const compiledTemplate = Handlebars.compile(template);
    return `${compiledTemplate(renderContext).trim()}\n`;
  } catch (error) {
    throw new RepomixError(`Failed to compile template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const generateOutput = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  deps = {
    buildOutputGeneratorContext,
    generateHandlebarOutput,
    generateParsableXmlOutput,
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
  );
  const renderContext = createRenderContext(outputGeneratorContext);

  if (!config.output.parsableStyle) return deps.generateHandlebarOutput(config, renderContext);
  switch (config.output.style) {
    case 'xml':
      return deps.generateParsableXmlOutput(renderContext);
    case 'markdown':
      return deps.generateHandlebarOutput(config, renderContext);
    default:
      return deps.generateHandlebarOutput(config, renderContext);
  }
};

export const buildOutputGeneratorContext = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  allFilePaths: string[],
  processedFiles: ProcessedFile[],
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

  let emptyDirPaths: string[] = [];
  if (config.output.includeEmptyDirectories) {
    try {
      emptyDirPaths = (await Promise.all(rootDirs.map((rootDir) => searchFiles(rootDir, config)))).reduce(
        (acc: FileSearchResult, curr: FileSearchResult) =>
          ({
            filePaths: [...acc.filePaths, ...curr.filePaths],
            emptyDirPaths: [...acc.emptyDirPaths, ...curr.emptyDirPaths],
          }) as FileSearchResult,
        { filePaths: [], emptyDirPaths: [] },
      ).emptyDirPaths;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepomixError(`Failed to search for empty directories: ${error.message}`);
      }
    }
  }

  return {
    generationDate: new Date().toISOString(),
    treeString: generateTreeString(allFilePaths, emptyDirPaths),
    processedFiles,
    config,
    instruction: repositoryInstruction,
  };
};
