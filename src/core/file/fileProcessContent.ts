import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { parseFile } from '../treeSitter/parseFile.js';
import { getFileManipulator } from './fileManipulate.js';
import type { RawFile } from './fileTypes.js';

/**
 * Process the content of a file according to the configuration
 * Applies various transformations based on the config:
 * - Remove comments
 * - Remove empty lines
 * - Compress content using Tree-sitter
 * - Add line numbers (either to original content or processed content)
 *
 * @param rawFile Raw file data containing path and content
 * @param config Repomix configuration
 * @returns Processed content string
 */
export const processContent = async (rawFile: RawFile, config: RepomixConfigMerged): Promise<string> => {
  const processStartAt = process.hrtime.bigint();
  let processedContent = rawFile.content;
  const manipulator = getFileManipulator(rawFile.path);

  logger.trace(`Processing file: ${rawFile.path}`);

  const originalLineNumbers = config.output.originalLineNumbers ?? false;

  const addLineNumbers = (content: string): string => {
    const lines = content.split('\n');
    const padding = Math.max(1, lines.length.toString().length);
    return lines
      .map((line, i) => `${(i + 1).toString().padStart(padding)}: ${line}`)
      .join('\n');
  };

  if (config.output.showLineNumbers && originalLineNumbers) {
    processedContent = addLineNumbers(processedContent);
  }

  if (config.output.compress) {
    try {
      const parsedContent = await parseFile(processedContent, rawFile.path, config);
      if (parsedContent === undefined) {
        logger.trace(`Failed to parse ${rawFile.path} in compressed mode. Using original content.`);
      }
      processedContent = parsedContent ?? processedContent;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error parsing ${rawFile.path} in compressed mode: ${message}`);
      throw error;
    }
  }

  if (manipulator) {
    if (config.output.removeComments && typeof manipulator.removeComments === 'function') {
      processedContent = manipulator.removeComments(processedContent);
    }

    if (config.output.removeEmptyLines && typeof manipulator.removeEmptyLines === 'function') {
      processedContent = manipulator.removeEmptyLines(processedContent);
    }
  }

  if (config.output.showLineNumbers && !originalLineNumbers) {
    processedContent = addLineNumbers(processedContent);
  }

  processedContent = processedContent.trim();

  const processEndAt = process.hrtime.bigint();
  logger.trace(`Processed file: ${rawFile.path}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`);

  return processedContent;
};
