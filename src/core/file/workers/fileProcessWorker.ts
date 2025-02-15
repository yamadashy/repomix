import type { RepomixConfigMerged } from '../../../config/configSchema.js';
import { logger } from '../../../shared/logger.js';
import { getFn_parseFile } from '../../tree-sitter/parseFile.js';
import { getFileManipulator } from '../fileManipulate.js';
import type { ProcessedFile, RawFile } from '../fileTypes.js';

export interface FileProcessTask {
  rawFile: RawFile;
  config: RepomixConfigMerged;
}

export default async ({ rawFile, config }: FileProcessTask): Promise<ProcessedFile> => {
  const processedContent = await processContent(rawFile, config);
  return {
    path: rawFile.path,
    content: processedContent,
  };
};

export const processContent = async (rawFile: RawFile, config: RepomixConfigMerged) => {
  const processStartAt = process.hrtime.bigint();
  let processedContent = rawFile.content;
  const manipulator = getFileManipulator(rawFile.path);

  logger.trace(`Processing file: ${rawFile.path}`);

  if (manipulator && config.output.removeComments) {
    processedContent = manipulator.removeComments(processedContent);
  }

  if (config.output.removeEmptyLines && manipulator) {
    processedContent = manipulator.removeEmptyLines(processedContent);
  }

  processedContent = processedContent.trim();

  if (config.output.compress) {
    const parseFile = await getFn_parseFile();
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
