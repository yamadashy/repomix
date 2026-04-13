import nodepath from 'node:path';
import type { FileLineOffset } from '../output/fileOffsets.js';
import { formatFileOffsetAnnotation } from '../output/fileOffsets.js';

export interface TreeNode {
  name: string;
  children: TreeNode[];
  isDirectory: boolean;
}

// WeakMap for O(1) child lookups during tree construction, avoiding O(n) linear scans
const childLookupCache = new WeakMap<TreeNode, Map<string, TreeNode>>();

const createTreeNode = (name: string, isDirectory: boolean): TreeNode => ({ name, children: [], isDirectory });

const getOrCreateChildMap = (node: TreeNode): Map<string, TreeNode> => {
  let map = childLookupCache.get(node);
  if (!map) {
    map = new Map();
    childLookupCache.set(node, map);
  }
  return map;
};

export const generateFileTree = (files: string[], emptyDirPaths: string[] = []): TreeNode => {
  const root: TreeNode = createTreeNode('root', true);

  for (const file of files) {
    addPathToTree(root, file, false);
  }

  // Add empty directories
  for (const dir of emptyDirPaths) {
    addPathToTree(root, dir, true);
  }

  return root;
};

const addPathToTree = (root: TreeNode, path: string, isDirectory: boolean): void => {
  const parts = path.split(nodepath.sep);
  let currentNode = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    const childMap = getOrCreateChildMap(currentNode);
    let child = childMap.get(part);

    if (!child) {
      child = createTreeNode(part, !isLastPart || isDirectory);
      currentNode.children.push(child);
      childMap.set(part, child);
    }

    currentNode = child;
  }
};

const sortTreeNodes = (node: TreeNode) => {
  node.children.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });

  for (const child of node.children) {
    sortTreeNodes(child);
  }
};

export const treeToString = (node: TreeNode, prefix = '', _isRoot = true): string => {
  if (_isRoot) {
    sortTreeNodes(node);
  }
  let result = '';

  for (const child of node.children) {
    result += `${prefix}${child.name}${child.isDirectory ? '/' : ''}\n`;
    if (child.isDirectory) {
      result += treeToString(child, `${prefix}  `, false);
    }
  }

  return result;
};

/**
 * Converts a tree to string with line counts for files.
 * @param node The tree node to convert
 * @param lineCounts Map of file paths to line counts
 * @param prefix Current indentation prefix
 * @param currentPath Current path being built (for looking up line counts)
 */
export const treeToStringWithLineCounts = (
  node: TreeNode,
  lineCounts: Record<string, number>,
  prefix = '',
  currentPath = '',
  _isRoot = true,
): string => {
  if (_isRoot) {
    sortTreeNodes(node);
  }
  let result = '';

  for (const child of node.children) {
    const childPath = currentPath ? `${currentPath}/${child.name}` : child.name;

    if (child.isDirectory) {
      result += `${prefix}${child.name}/\n`;
      result += treeToStringWithLineCounts(child, lineCounts, `${prefix}  `, childPath, false);
    } else {
      const lineCount = lineCounts[childPath];
      const lineCountSuffix = lineCount !== undefined ? ` (${lineCount} lines)` : '';
      result += `${prefix}${child.name}${lineCountSuffix}\n`;
    }
  }

  return result;
};

export const generateTreeString = (files: string[], emptyDirPaths: string[] = []): string => {
  const tree = generateFileTree(files, emptyDirPaths);
  return treeToString(tree).trim();
};

export const generateTreeStringWithLineCounts = (
  files: string[],
  lineCounts: Record<string, number>,
  emptyDirPaths: string[] = [],
): string => {
  const tree = generateFileTree(files, emptyDirPaths);
  return treeToStringWithLineCounts(tree, lineCounts).trim();
};

/**
 * Converts a tree to string with line offset annotations for files in the output.
 * @param node The tree node to convert
 * @param offsets Map of file paths to their line ranges in the output file
 * @param prefix Current indentation prefix
 * @param currentPath Current path being built (for looking up offsets)
 */
export const treeToStringWithFileOffsets = (
  node: TreeNode,
  offsets: Record<string, FileLineOffset>,
  prefix = '',
  currentPath = '',
  _isRoot = true,
): string => {
  if (_isRoot) {
    sortTreeNodes(node);
  }
  let result = '';

  for (const child of node.children) {
    const childPath = currentPath ? `${currentPath}/${child.name}` : child.name;

    if (child.isDirectory) {
      result += `${prefix}${child.name}/\n`;
      result += treeToStringWithFileOffsets(child, offsets, `${prefix}  `, childPath, false);
    } else {
      const offset = offsets[childPath];
      const offsetSuffix = offset ? formatFileOffsetAnnotation(offset) : '';
      result += `${prefix}${child.name}${offsetSuffix}\n`;
    }
  }

  return result;
};

export const generateTreeStringWithFileOffsets = (
  files: string[],
  offsets: Record<string, FileLineOffset>,
  emptyDirPaths: string[] = [],
): string => {
  const tree = generateFileTree(files, emptyDirPaths);
  return treeToStringWithFileOffsets(tree, offsets).trim();
};

/**
 * Generates a tree string with root directory labels and file offset annotations.
 * For single root, returns the standard flat tree with offsets.
 * For multiple roots, each section is labeled with [rootLabel]/.
 *
 * @param filesByRoot Array of root directories with their files
 * @param offsets Map of file paths to their line ranges in the output file
 * @param emptyDirPaths Optional paths to empty directories
 */
export const generateTreeStringWithRootsAndFileOffsets = (
  filesByRoot: FilesByRoot[],
  offsets: Record<string, FileLineOffset>,
  emptyDirPaths: string[] = [],
): string => {
  // Single root: use existing behavior without labels
  if (filesByRoot.length === 1) {
    return generateTreeStringWithFileOffsets(filesByRoot[0].files, offsets, emptyDirPaths);
  }

  // Multiple roots: generate labeled sections
  return generateMultiRootSections(filesByRoot, (tree, prefix) => treeToStringWithFileOffsets(tree, offsets, prefix));
};

/**
 * Represents files grouped by their root directory.
 */
export interface FilesByRoot {
  rootLabel: string;
  files: string[];
}

/**
 * Internal helper function to generate multi-root tree sections.
 * Extracts common logic used by both generateTreeStringWithRoots and generateTreeStringWithRootsAndLineCounts.
 *
 * Note: Empty directories (emptyDirPaths) are not included in multi-root output.
 * This is because emptyDirPaths would need to be filtered per-root to avoid cross-root
 * contamination, which would require additional complexity. For most use cases,
 * empty directories are less important in multi-root scenarios.
 */
const generateMultiRootSections = (
  filesByRoot: FilesByRoot[],
  treeToStringFn: (tree: TreeNode, prefix: string) => string,
): string => {
  const sections: string[] = [];

  for (const { rootLabel, files } of filesByRoot) {
    if (files.length === 0) {
      continue;
    }

    const tree = generateFileTree(files);
    const treeContent = treeToStringFn(tree, '  ');
    sections.push(`[${rootLabel}]/\n${treeContent}`);
  }

  return sections.join('\n').trim();
};

/**
 * Generates a tree string with root directory labels when multiple roots are provided.
 * For single root, returns the standard flat tree.
 * For multiple roots, each section is labeled with [rootLabel]/.
 *
 * @param filesByRoot Array of root directories with their files
 * @param emptyDirPaths Optional paths to empty directories
 */
export const generateTreeStringWithRoots = (filesByRoot: FilesByRoot[], emptyDirPaths: string[] = []): string => {
  // Single root: use existing behavior without labels
  if (filesByRoot.length === 1) {
    return generateTreeString(filesByRoot[0].files, emptyDirPaths);
  }

  // Multiple roots: generate labeled sections
  return generateMultiRootSections(filesByRoot, (tree, prefix) => treeToString(tree, prefix));
};

/**
 * Generates a tree string with root directory labels and line counts.
 * For single root, returns the standard flat tree with line counts.
 * For multiple roots, each section is labeled with [rootLabel]/.
 *
 * @param filesByRoot Array of root directories with their files
 * @param lineCounts Map of file paths to line counts
 * @param emptyDirPaths Optional paths to empty directories
 */
export const generateTreeStringWithRootsAndLineCounts = (
  filesByRoot: FilesByRoot[],
  lineCounts: Record<string, number>,
  emptyDirPaths: string[] = [],
): string => {
  // Single root: use existing behavior without labels
  if (filesByRoot.length === 1) {
    return generateTreeStringWithLineCounts(filesByRoot[0].files, lineCounts, emptyDirPaths);
  }

  // Multiple roots: generate labeled sections
  return generateMultiRootSections(filesByRoot, (tree, prefix) => treeToStringWithLineCounts(tree, lineCounts, prefix));
};
