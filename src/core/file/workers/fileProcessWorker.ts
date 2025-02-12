import type { RepomixConfigMerged } from '../../../config/configSchema.js';
import { logger } from '../../../shared/logger.js';
import { getFileManipulator } from '../fileManipulate.js';
import type { ProcessedFile, RawFile } from '../fileTypes.js';
import { getFn_parseFile } from '../../tree-sitter/parseFile.js';

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
    processedContent = (await parseFile(processedContent, rawFile.path, config)) ?? processedContent;
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
