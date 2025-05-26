/**
 * File tree generation utilities
 */
import path from 'node:path';

/**
 * Tree node structure
 */
export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isDirectory: boolean;
}

/**
 * Generate a tree structure from file paths
 */
export const generateFileTree = (filePaths: string[], emptyDirPaths: string[] = []): TreeNode => {
  const root: TreeNode = {
    name: '',
    path: '',
    children: [],
    isDirectory: true,
  };

  for (const filePath of filePaths) {
    addPathToTree(root, filePath, false);
  }

  for (const dirPath of emptyDirPaths) {
    addPathToTree(root, dirPath, true);
  }

  return root;
};

/**
 * Add a path to the tree
 */
const addPathToTree = (root: TreeNode, filePath: string, isDirectory: boolean): void => {
  const parts = filePath.split('/');
  let current = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    const currentPath = parts.slice(0, i + 1).join('/');

    let child = current.children.find((c) => c.name === part);

    if (!child) {
      child = {
        name: part,
        path: currentPath,
        children: [],
        isDirectory: isLastPart ? isDirectory : true,
      };
      current.children.push(child);
    }

    current = child;
  }
};

/**
 * Generate a string representation of the tree
 */
export const generateTreeString = (filePaths: string[], emptyDirPaths: string[] = []): string => {
  const tree = generateFileTree(filePaths, emptyDirPaths);
  return treeToString(tree);
};

/**
 * Convert a tree to a string
 */
export const treeToString = (node: TreeNode, prefix = '', isLast = true): string => {
  if (node.name === '') {
    return node.children.map((child, index) => treeToString(child, '', index === node.children.length - 1)).join('');
  }

  let result = prefix;
  result += isLast ? '└── ' : '├── ';
  result += node.name + (node.isDirectory && !node.name.endsWith('/') ? '/' : '');
  result += '\n';

  const childPrefix = prefix + (isLast ? '    ' : '│   ');

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const isChildLast = i === node.children.length - 1;
    result += treeToString(child, childPrefix, isChildLast);
  }

  return result;
};
