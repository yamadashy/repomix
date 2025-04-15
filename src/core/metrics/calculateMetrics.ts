import type { RepomixConfigMerged } from "../../config/configSchema.js";
import type { RepomixProgressCallback } from "../../shared/types.js";
import type { ProcessedFile } from "../file/fileTypes.js";
import { calculateAllFileMetrics } from "./calculateAllFileMetrics.js";
import { calculateOutputMetrics } from "./calculateOutputMetrics.js";

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  fileLineCounts: Record<string, number>;
  totalLines: number;
}

export const calculateMetrics = async (
  processedFiles: ProcessedFile[],
  output: string,
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  deps = {
    calculateAllFileMetrics,
    calculateOutputMetrics,
  }
): Promise<CalculateMetricsResult> => {
  progressCallback("Calculating metrics...");

  const [fileMetrics, totalTokens] = await Promise.all([
    deps.calculateAllFileMetrics(
      processedFiles,
      config.tokenCount.encoding,
      progressCallback
    ),
    deps.calculateOutputMetrics(
      output,
      config.tokenCount.encoding,
      config.output.filePath
    ),
  ]);

  const totalFiles = processedFiles.length;
  const totalCharacters = output.length;

  const fileCharCounts: Record<string, number> = {};
  const fileTokenCounts: Record<string, number> = {};
  const fileLineCounts: Record<string, number> = {};
  let totalLines = 0;
  for (const file of fileMetrics) {
    fileCharCounts[file.path] = file.charCount;
    fileTokenCounts[file.path] = file.tokenCount;
    fileLineCounts[file.path] = file.lineCount;
    totalLines += file.lineCount;
  }

  return {
    totalFiles,
    totalCharacters,
    totalTokens,
    fileCharCounts,
    fileTokenCounts,
    fileLineCounts,
    totalLines,
  };
};
