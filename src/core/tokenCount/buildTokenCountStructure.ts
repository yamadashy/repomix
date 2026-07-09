import type { FileTokenInfo } from './types.js';

export interface FileWithTokens {
  path: string;
  tokens: number;
}

// A directory node in the token-count tree. Files and metadata live in dedicated
// fields, and child directories are kept in a separate `children` map, so a directory
// can be named anything (including `files`, `tokenSum`, or `__proto__`) without
// colliding with the metadata fields or the object prototype.
export interface TokenCountTreeNode {
  files: FileTokenInfo[];
  tokenSum: number;
  children: Map<string, TokenCountTreeNode>;
}

const createNode = (): TokenCountTreeNode => ({ files: [], tokenSum: 0, children: new Map() });

export const buildTokenCountTree = (filesWithTokens: FileWithTokens[]): TokenCountTreeNode => {
  const root = createNode();

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
      let child = current.children.get(part);
      if (!child) {
        child = createNode();
        current.children.set(part, child);
      }
      current = child;
    }

    // Add the file
    current.files.push({
      name: fileName,
      tokens: file.tokens,
    });
  }

  // Calculate token sums for each directory
  calculateTokenSums(root);

  return root;
};

const calculateTokenSums = (node: TokenCountTreeNode): number => {
  // Tokens from files directly in this directory
  let totalTokens = node.files.reduce((sum, file) => sum + file.tokens, 0);

  // Plus tokens rolled up from every subdirectory
  for (const child of node.children.values()) {
    totalTokens += calculateTokenSums(child);
  }

  node.tokenSum = totalTokens;
  return totalTokens;
};
