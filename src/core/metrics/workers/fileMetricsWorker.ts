import type { TiktokenEncoding } from 'tiktoken';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { ProcessedFile } from '../../file/fileTypes.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';
import type { FileMetrics } from './types.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface FileMetricsTask {
  file: ProcessedFile;
  index: number;
  totalFiles: number;
  encoding: TiktokenEncoding;
}

export default async ({ file, encoding }: FileMetricsTask): Promise<FileMetrics> => {
  const processStartAt = process.hrtime.bigint();
  const metrics = await calculateIndividualFileMetrics(file, encoding);
  const processEndAt = process.hrtime.bigint();
  logger.trace(
    `Calculated metrics for ${file.path}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
  );

  return metrics;
};

export const calculateIndividualFileMetrics = async (
  file: ProcessedFile,
  encoding: TiktokenEncoding,
): Promise<FileMetrics> => {
  const charCount = file.content.length;
  const tokenCounter = getTokenCounter(encoding);
  const tokenCount = tokenCounter.countTokens(file.content, file.path);

  return { path: file.path, charCount, tokenCount };
};

// Cleanup when worker is terminated
process.on('exit', () => {
  freeTokenCounters();
});
