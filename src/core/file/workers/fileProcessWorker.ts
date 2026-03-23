import type { RepomixConfigMerged } from '../../../config/configSchema.js';
import { setLogLevelByWorkerData } from '../../../shared/logger.js';
import { processContent } from '../fileProcessContent.js';
import type { ProcessedFile, RawFile } from '../fileTypes.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface FileProcessTask {
  rawFile: RawFile;
  config: RepomixConfigMerged;
}

// Batched task: multiple files + single config copy to reduce structured clone overhead.
// Without batching, config is cloned ~1000 times (once per file). With batching,
// config is cloned only numCPUs*2 times (~8 times for 4 CPUs).
export interface FileProcessBatchTask {
  batch: RawFile[];
  config: RepomixConfigMerged;
}

export default async (task: FileProcessTask | FileProcessBatchTask): Promise<ProcessedFile | ProcessedFile[]> => {
  // Batch mode: process multiple files in one worker call
  if ('batch' in task) {
    const results: ProcessedFile[] = [];
    for (const rawFile of task.batch) {
      const processedContent = await processContent(rawFile, task.config);
      results.push({ path: rawFile.path, content: processedContent });
    }
    return results;
  }

  // Single task mode (backwards compatible)
  const processedContent = await processContent(task.rawFile, task.config);
  return {
    path: task.rawFile.path,
    content: processedContent,
  };
};

// Export cleanup function for Tinypool teardown
// Lazy-load cleanupLanguageParser: web-tree-sitter is only loaded when compress is enabled.
// If compress was never used, there's nothing to clean up.
export const onWorkerTermination = async (): Promise<void> => {
  const { cleanupLanguageParser } = await import('../../treeSitter/parseFile.js');
  await cleanupLanguageParser();
};
