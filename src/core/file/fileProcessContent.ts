import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { parseFile } from '../treeSitter/parseFile.js';
import { getFileManipulator } from './fileManipulate.js';
import type { RawFile } from './fileTypes.js';
import { truncateBase64Content } from './truncateBase64.js';

/**
 * Process the content of a file according to the configuration
 * Applies various transformations based on the config:
 * - Remove comments
 * - Remove empty lines
 * - Truncate base64 encoded data
 * - Compress content using Tree-sitter
 * - Add line numbers
 *
 * @param rawFile Raw file data containing path and content
 * @param config Repomix configuration
 * @returns Processed content string
 */
export const processContent = async (rawFile: RawFile, config: RepomixConfigMerged): Promise<string> => {
  const processStartAt = process.hrtime.bigint();
  if (rawFile.content === undefined) {
    throw new Error(`No content to process for ${rawFile.path}`);
  }
  let processedContent = rawFile.content;
  const manipulator = getFileManipulator(rawFile.path);

  logger.trace(`Processing file: ${rawFile.path}`);

  if (config.output.truncateBase64) {
    processedContent = truncateBase64Content(processedContent);
  }

  if (manipulator && config.output.removeComments) {
    processedContent = manipulator.removeComments(processedContent);
  }

  if (config.output.removeEmptyLines && manipulator) {
    processedContent = manipulator.removeEmptyLines(processedContent);
  }

  processedContent = processedContent.trim();

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
      //re-throw error
      throw error;
    }
  } else if (config.output.showLineNumbers) {
    const lines = processedContent.split('\n');
    const padding = lines.length.toString().length;
    const numberedLines = lines.map((line, i) => `${(i + 1).toString().padStart(padding)}: ${line}`);
    processedContent = numberedLines.join('\n');
  }

  const processEndAt = process.hrtime.bigint();
  logger.trace(`Processed file: ${rawFile.path}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`);

  return processedContent;
};
