import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import type { ProcessedFile } from '../../core/file/fileTypes.js';
import {
  buildTokenCountTree,
  type FileWithTokens,
  type TokenCountTreeNode,
} from '../../core/tokenCount/buildTokenCountStructure.js';
import { logger } from '../../shared/logger.js';

export const reportTokenCountTree = (
  processedFiles: ProcessedFile[],
  fileTokenCounts: Record<string, number>,
  config: RepomixConfigMerged,
) => {
  const minTokenCount = typeof config.output.tokenCountTree === 'number' ? config.output.tokenCountTree : 0;

  const filesWithTokens: FileWithTokens[] = [];
  for (const file of processedFiles) {
    const tokens = fileTokenCounts[file.path];
    if (tokens !== undefined) {
      filesWithTokens.push({
        path: file.path,
        tokens,
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

const displayNode = (node: TokenCountTreeNode, prefix: string, isRoot: boolean, minTokenCount: number): void => {
  // Get child directories that meet the minimum token count
  const entries = [...node.children].filter(([, child]) => child.tokenSum >= minTokenCount);

  // Get files in this directory and filter by minimum token count
  const files = node.files.filter((file) => file.tokens >= minTokenCount);

  // Sort entries alphabetically
  entries.sort(([a], [b]) => a.localeCompare(b));
  files.sort((a, b) => a.name.localeCompare(b.name));

  // Display files first
  files.forEach((file, index) => {
    const isLastFile = index === files.length - 1 && entries.length === 0;
    const connector = isLastFile ? '└── ' : '├── ';
    const tokenInfo = pc.dim(`(${file.tokens.toLocaleString()} tokens)`);

    if (isRoot && prefix === '') {
      logger.log(`${connector}${file.name} ${tokenInfo}`);
    } else {
      logger.log(`${prefix}${connector}${file.name} ${tokenInfo}`);
    }
  });

  // Display directories
  entries.forEach(([name, childNode], index) => {
    const isLastEntry = index === entries.length - 1;
    const connector = isLastEntry ? '└── ' : '├── ';
    const tokenInfo = pc.dim(`(${childNode.tokenSum.toLocaleString()} tokens)`);

    if (isRoot && prefix === '') {
      logger.log(`${connector}${name}/ ${tokenInfo}`);
    } else {
      logger.log(`${prefix}${connector}${name}/ ${tokenInfo}`);
    }

    // Prepare prefix for children
    const childPrefix =
      isRoot && prefix === '' ? (isLastEntry ? '    ' : '│   ') : prefix + (isLastEntry ? '    ' : '│   ');

    displayNode(childNode, childPrefix, false, minTokenCount);
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
