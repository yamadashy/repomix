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
  }

  if (config.output.showLineNumbers) {
    const lines = processedContent.split('\n');

    // Check if content has preserved line numbers from compression (format: @LINE:N@content)
    const lineNumberPattern = /^@LINE:(\d+)@/;
    const hasPreservedLineNumbers = lines.some((line) => lineNumberPattern.test(line));

    if (hasPreservedLineNumbers) {
      // Extract original line numbers and content
      const lineData = lines.map((line) => {
        const match = line.match(lineNumberPattern);
        if (match) {
          const originalLineNumber = Number.parseInt(match[1], 10);
          const content = line.slice(match[0].length); // Remove the @LINE:N@ prefix
          return { lineNumber: originalLineNumber, content };
        }
        // For separator lines or lines without markers, keep them as-is
        return { lineNumber: null, content: line };
      });

      // Find the maximum line number for padding
      const maxLineNumber = Math.max(...lineData.map((d) => d.lineNumber || 0));
      const padding = maxLineNumber.toString().length;

      // Format lines with original line numbers
      const numberedLines = lineData.map((data) => {
        if (data.lineNumber !== null) {
          return `${data.lineNumber.toString().padStart(padding)}: ${data.content}`;
        }
        // For separator lines, just add padding spaces
        return `${' '.repeat(padding)}  ${data.content}`;
      });

      processedContent = numberedLines.join('\n');
    } else {
      // No preserved line numbers, use sequential numbering
      const padding = lines.length.toString().length;
      const numberedLines = lines.map((line, i) => `${(i + 1).toString().padStart(padding)}: ${line}`);
      processedContent = numberedLines.join('\n');
    }
  }

  const processEndAt = process.hrtime.bigint();
  logger.trace(`Processed file: ${rawFile.path}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`);

  return processedContent;
};
