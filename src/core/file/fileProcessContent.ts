import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { parseFile } from '../treeSitter/parseFile.js';
import { getFileManipulator } from './fileManipulate.js';
import type { RawFile, TruncationInfo } from './fileTypes.js';
import { applyLineLimit } from './lineLimitProcessor.js';
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
 * @returns Processed content string and truncation info
 */
export const processContent = async (
  rawFile: RawFile,
  config: RepomixConfigMerged,
): Promise<{ content: string; originalContent?: string; truncation?: TruncationInfo }> => {
  const processStartAt = process.hrtime.bigint();
  let processedContent = rawFile.content;
  const originalContent = rawFile.content; // Store original content before any processing
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

  let truncation: TruncationInfo | undefined;

  // Apply line limiting if enabled
  if (config.output.lineLimit) {
    try {
      const originalLineCount = processedContent.split('\n').length;
      logger.trace(
        `About to apply line limit ${config.output.lineLimit} to file: ${rawFile.path} with ${originalLineCount} lines`,
      );

      const lineLimitResult = await applyLineLimit(processedContent, rawFile.path, config.output.lineLimit, {
        preserveStructure: true,
        showTruncationIndicators: false, // We'll handle indicators in output styles
        enableCaching: true,
      });

      processedContent = lineLimitResult.content;

      if (lineLimitResult.truncation?.truncated) {
        truncation = lineLimitResult.truncation;
        logger.trace(
          `File was truncated: ${rawFile.path} from ${lineLimitResult.truncation.originalLineCount} to ${lineLimitResult.truncation.truncatedLineCount} lines`,
        );
      } else {
        logger.trace(`File was not truncated: ${rawFile.path}`);
      }

      logger.trace(`Applied line limit ${config.output.lineLimit} to file: ${rawFile.path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to apply line limit to ${rawFile.path}: ${message}`);
      // Continue with original content if line limiting fails
      // Set truncation info to indicate no truncation occurred due to error
      truncation = {
        truncated: false,
        originalLineCount: processedContent.split('\n').length,
        truncatedLineCount: processedContent.split('\n').length,
        lineLimit: config.output.lineLimit!,
      };
    }
  }

  const processEndAt = process.hrtime.bigint();
  logger.trace(`Processed file: ${rawFile.path}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`);

  return { content: processedContent, originalContent, truncation };
};
