import type { TiktokenEncoding } from 'tiktoken';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { TokenCounter } from '../metrics/TokenCounter.js';
import type { FileWithTokens } from './buildTokenCountStructure.js';
import { displayTokenCountTree } from './displayTokenCountTree.js';

export const summarizeTokenCounts = async (
  processedFiles: ProcessedFile[],
  encoding: TiktokenEncoding,
  progressCallback: RepomixProgressCallback,
  minTokenCount = 0,
): Promise<void> => {
  progressCallback('Calculating token counts for all files...');

  const tokenCounter = new TokenCounter(encoding);
  const filesWithTokens: FileWithTokens[] = [];

  try {
    // Calculate tokens for all files
    for (const file of processedFiles) {
      const tokens = tokenCounter.countTokens(file.content, file.path);
      filesWithTokens.push({
        path: file.path,
        tokens,
      });
    }

    // Display the token count tree
    displayTokenCountTree(filesWithTokens, minTokenCount);
  } finally {
    tokenCounter.free();
  }
};
