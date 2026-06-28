import type { RepomixConfigMerged } from '../../../config/configSchema.js';
import { setLogLevelByWorkerData } from '../../../shared/logger.js';
import { cleanupLanguageParser } from '../../treeSitter/parseFile.js';
import type { FileInclusionLevel } from '../fileLevelResolve.js';
import { processContent } from '../fileProcessContent.js';
import type { ProcessedFile, RawFile } from '../fileTypes.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface FileProcessTask {
  rawFile: RawFile;
  config: RepomixConfigMerged;
  // Precomputed in the main thread (processFiles) so the worker does not repeat
  // the glob matching to resolve the inclusion level.
  level: FileInclusionLevel;
}

export default async ({ rawFile, config, level }: FileProcessTask): Promise<ProcessedFile> => {
  const processedContent = await processContent(rawFile, config, level);
  return {
    path: rawFile.path,
    content: processedContent,
  };
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  await cleanupLanguageParser();
};
