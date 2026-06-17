import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { parseFile } from '../treeSitter/parseFile.js';
import { type FileInclusionLevel, resolveFileLevel } from './fileLevelResolve.js';
import { getFileManipulator } from './fileManipulate.js';
import type { RawFile } from './fileTypes.js';

/**
 * Process the content of a file for CPU-intensive operations.
 * Only handles heavy transformations that benefit from worker threads:
 * - Remove comments (language-specific AST manipulation)
 * - Compress content using Tree-sitter
 *
 * Lightweight transforms (truncateBase64, removeEmptyLines, trim, showLineNumbers)
 * are applied separately on the main thread by processFiles().
 */
export const processContent = async (
  rawFile: RawFile,
  config: RepomixConfigMerged,
  level?: FileInclusionLevel,
): Promise<string> => {
  const processStartAt = process.hrtime.bigint();
  let processedContent = rawFile.content;
  const manipulator = getFileManipulator(rawFile.path);

  logger.trace(`Processing file: ${rawFile.path}`);

  if (manipulator && config.output.removeComments) {
    processedContent = manipulator.removeComments(processedContent);
  }

  // Compress when this file resolves to the 'compress' level. The level is
  // normally precomputed in the main thread and threaded through; fall back to
  // resolving it here when it is not supplied. This honors per-file
  // output.patterns overrides and the global output.compress setting.
  const effectiveLevel = level ?? resolveFileLevel(rawFile.path, config.output);
  if (effectiveLevel === 'compress') {
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

  const processEndAt = process.hrtime.bigint();
  logger.trace(`Processed file: ${rawFile.path}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`);

  return processedContent;
};
