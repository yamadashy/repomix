import type { FileTokenInfo } from './types.js';

export interface FileWithTokens {
  path: string;
  tokens: number;
}

export interface TreeNode {
  _files?: FileTokenInfo[];
  _tokenSum?: number;
  [key: string]: TreeNode | FileTokenInfo[] | number | undefined;
}

export const buildTokenCountTree = (filesWithTokens: FileWithTokens[]): TreeNode => {
  const root: TreeNode = {};

  for (const file of filesWithTokens) {
    // The file.path is already relative to the root directory
    if (!file.path || typeof file.path !== 'string') {
      continue;
    }
    // Always use forward slash for consistency across platforms
    const parts = file.path.split('/');
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

  // Add tokens from subdirectories. Subdirectory values are TreeNode objects,
  // while the metadata fields are an array (_files) and a number (_tokenSum),
  // so the value-type check alone separates them. A key-prefix check here would
  // also drop real directories whose name starts with '_' (e.g. __tests__).
  for (const value of Object.values(node)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    totalTokens += calculateTokenSums(value as TreeNode);
  }

  node._tokenSum = totalTokens;
  return totalTokens;
};
