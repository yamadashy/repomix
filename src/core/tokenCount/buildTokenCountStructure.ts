import path from 'node:path';
import type { DirectoryTokenInfo, FileTokenInfo, TokenCountOutput } from './types.js';

export interface FileWithTokens {
  path: string;
  tokens: number;
}

interface TreeNode {
  _files?: FileTokenInfo[];
  _tokenSum?: number;
  [key: string]: TreeNode | FileTokenInfo[] | number | undefined;
}

export const buildTokenCountTree = (filesWithTokens: FileWithTokens[]): TreeNode => {
  const root: TreeNode = {};

  for (const file of filesWithTokens) {
    // The file.path is already relative to the root directory
    const parts = file.path.split(path.sep);
    const fileName = parts.pop();
    if (!fileName) continue;

    // Navigate/create the directory structure
    let current = root;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as TreeNode;
    }

    // Add the file
    if (!current._files) {
      current._files = [];
    }
    current._files.push({
      name: fileName,
      tokens: file.tokens,
    });
  }

  // Calculate token sums for each directory
  calculateTokenSums(root);

  return root;
};

const calculateTokenSums = (node: TreeNode): number => {
  let totalTokens = 0;

  // Add tokens from files in this directory
  if (node._files) {
    totalTokens += node._files.reduce((sum, file) => sum + file.tokens, 0);
  }

  // Add tokens from subdirectories
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_') || !value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    totalTokens += calculateTokenSums(value as TreeNode);
  }

  node._tokenSum = totalTokens;
  return totalTokens;
};

export const buildTokenCountStructure = (filesWithTokens: FileWithTokens[], rootDirs: string[]): TokenCountOutput => {
  const root = buildTokenCountTree(filesWithTokens);
  return convertToOutput(root);
};

const findCommonRoot = (paths: string[]): string => {
  if (paths.length === 0) return '';
  if (paths.length === 1) return paths[0];

  const parts = paths[0].split(path.sep);
  const commonParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (paths.every((p) => p.split(path.sep)[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.join(path.sep) || '/';
};

const convertToOutput = (node: TreeNode, isRoot = true): TokenCountOutput => {
  const result: DirectoryTokenInfo[] = [];

  // Handle directories
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_')) continue;

    const dirInfo: DirectoryTokenInfo = {
      name: key,
      files: (value as TreeNode)._files || [],
    };

    // Check for subdirectories
    const subdirs = convertToOutput(value as TreeNode, false);
    if (subdirs.length > 0) {
      dirInfo.directories = subdirs;
    }

    result.push(dirInfo);
  }

  // Handle root-level files (only at the actual root level)
  if (isRoot && node._files) {
    for (const file of node._files) {
      result.push({
        name: file.name,
        files: [file],
      });
    }
  }

  return result;
};
