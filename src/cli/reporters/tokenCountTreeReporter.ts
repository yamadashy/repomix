import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import type { ProcessedFile } from '../../core/file/fileTypes.js';
import {
  buildTokenCountTree,
  type FileWithTokens,
  type TreeNode,
} from '../../core/tokenCount/buildTokenCountStructure.js';
import { logger } from '../../shared/logger.js';

export const reportTokenCountTree = (
  processedFiles: ProcessedFile[],
  fileTokenCounts: Record<string, number>,
  config: RepomixConfigMerged,
  fileOriginalTokenCounts: Record<string, number> = {},
) => {
  const minTokenCount = typeof config.output.tokenCountTree === 'number' ? config.output.tokenCountTree : 0;

  const filesWithTokens: FileWithTokens[] = [];
  for (const file of processedFiles) {
    const tokens = fileTokenCounts[file.path];
    const originalTokens = fileOriginalTokenCounts[file.path];
    if (tokens !== undefined) {
      filesWithTokens.push({
        path: file.path,
        tokens,
        originalTokens,
        truncated: file.truncation?.truncated || false,
      });
    }
  }

  // Display the token count tree
  logger.log('🔢 Token Count Tree:');
  logger.log(pc.dim('────────────────────'));

  if (minTokenCount > 0) {
    logger.log(`Showing entries with ${minTokenCount}+ tokens:`);
  }

  const tree = buildTokenCountTree(filesWithTokens);
  displayNode(tree, '', true, minTokenCount);
};

const displayNode = (node: TreeNode, prefix: string, isRoot: boolean, minTokenCount: number): void => {
  // Get all directory entries (excluding _files and _tokenSum)
  const allEntries = Object.entries(node).filter(
    ([key, value]) => !key.startsWith('_') && value && typeof value === 'object' && !Array.isArray(value),
  );

  // Filter directories by minimum token count
  const entries = allEntries.filter(([, value]) => {
    const tokenSum = (value as TreeNode)._tokenSum || 0;
    return tokenSum >= minTokenCount;
  });

  // Get files in this directory and filter by minimum token count
  const allFiles = node._files || [];
  const files = allFiles.filter((file) => file.tokens >= minTokenCount);

  // Sort entries alphabetically
  entries.sort(([a], [b]) => a.localeCompare(b));
  files.sort((a, b) => a.name.localeCompare(b.name));

  // Display files first
  files.forEach((file, index) => {
    const isLastFile = index === files.length - 1 && entries.length === 0;
    const connector = isLastFile ? '└── ' : '├── ';

    // Build token info string
    let tokenInfo = pc.dim(`(${file.tokens.toLocaleString()} tokens)`);

    // Add original token count if available and different from truncated
    if (file.originalTokens && file.originalTokens !== file.tokens) {
      const reduction = Math.round(((file.originalTokens - file.tokens) / file.originalTokens) * 100);
      tokenInfo += pc.dim(` → ${file.originalTokens.toLocaleString()} original, ${reduction}% reduction`);
    }

    // Add truncation indicator if file was truncated
    const truncationIndicator = file.truncated ? pc.yellow('[T] ') : '';

    if (isRoot && prefix === '') {
      logger.log(`${connector}${truncationIndicator}${file.name} ${tokenInfo}`);
    } else {
      logger.log(`${prefix}${connector}${truncationIndicator}${file.name} ${tokenInfo}`);
    }
  });

  // Display directories
  entries.forEach(([name, childNode], index) => {
    const isLastEntry = index === entries.length - 1;
    const connector = isLastEntry ? '└── ' : '├── ';
    const tokenSum = (childNode as TreeNode)._tokenSum || 0;
    const tokenInfo = pc.dim(`(${tokenSum.toLocaleString()} tokens)`);

    if (isRoot && prefix === '') {
      logger.log(`${connector}${name}/ ${tokenInfo}`);
    } else {
      logger.log(`${prefix}${connector}${name}/ ${tokenInfo}`);
    }

    // Prepare prefix for children
    const childPrefix =
      isRoot && prefix === '' ? (isLastEntry ? '    ' : '│   ') : prefix + (isLastEntry ? '    ' : '│   ');

    displayNode(childNode as TreeNode, childPrefix, false, minTokenCount);
  });

  // If this is the root and it's empty, show a message
  if (isRoot && files.length === 0 && entries.length === 0) {
    if (minTokenCount > 0) {
      logger.log(`No files or directories found with ${minTokenCount}+ tokens.`);
    } else {
      logger.log('No files found.');
    }
  }
};
