import nodepath from 'node:path';

export interface TreeNode {
  name: string;
  children: TreeNode[];
  isDirectory: boolean;
}

// Internal interface with Map for O(1) lookup during tree construction
interface InternalTreeNode extends TreeNode {
  childrenMap: Map<string, InternalTreeNode>;
}

const createInternalNode = (name: string, isDirectory: boolean): InternalTreeNode => ({
  name,
  children: [],
  isDirectory,
  childrenMap: new Map(),
});

// Clean up internal Map references after tree construction
const cleanupInternalRefs = (node: InternalTreeNode): TreeNode => {
  for (const child of node.children) {
    cleanupInternalRefs(child as InternalTreeNode);
  }
  // Delete the Map to free memory (it's no longer needed after construction)
  node.childrenMap.clear();
  return node;
};

export const generateFileTree = (files: string[], emptyDirPaths: string[] = []): TreeNode => {
  const root: InternalTreeNode = createInternalNode('root', true);

  for (const file of files) {
    addPathToTree(root, file, false);
  }

  // Add empty directories
  for (const dir of emptyDirPaths) {
    addPathToTree(root, dir, true);
  }

  return cleanupInternalRefs(root);
};

const addPathToTree = (root: InternalTreeNode, path: string, isDirectory: boolean): void => {
  const parts = path.split(nodepath.sep);
  let currentNode = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;

    // Use Map for O(1) lookup instead of O(N) array search
    let child = currentNode.childrenMap.get(part);

    if (!child) {
      child = createInternalNode(part, !isLastPart || isDirectory);
      currentNode.children.push(child);
      currentNode.childrenMap.set(part, child);
    }

    currentNode = child;
  }
};

// Sort tree nodes recursively (called once before stringification)
const sortTreeNodes = (node: TreeNode): void => {
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

// Internal helper that converts tree to string without sorting
const treeToStringInternal = (node: TreeNode, prefix: string): string => {
  let result = '';

  for (const child of node.children) {
    result += `${prefix}${child.name}${child.isDirectory ? '/' : ''}\n`;
    if (child.isDirectory) {
      result += treeToStringInternal(child, `${prefix}  `);
    }
  }

  return result;
};

export const treeToString = (node: TreeNode, prefix = ''): string => {
  // Sort once at the top level, not recursively during stringification
  sortTreeNodes(node);
  return treeToStringInternal(node, prefix);
};

// Internal helper that converts tree to string with line counts without sorting
const treeToStringWithLineCountsInternal = (
  node: TreeNode,
  lineCounts: Record<string, number>,
  prefix: string,
  currentPath: string,
): string => {
  let result = '';

  for (const child of node.children) {
    const childPath = currentPath ? `${currentPath}/${child.name}` : child.name;

    if (child.isDirectory) {
      result += `${prefix}${child.name}/\n`;
      result += treeToStringWithLineCountsInternal(child, lineCounts, `${prefix}  `, childPath);
    } else {
      const lineCount = lineCounts[childPath];
      const lineCountSuffix = lineCount !== undefined ? ` (${lineCount} lines)` : '';
      result += `${prefix}${child.name}${lineCountSuffix}\n`;
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
): string => {
  // Sort once at the top level, not recursively during stringification
  sortTreeNodes(node);
  return treeToStringWithLineCountsInternal(node, lineCounts, prefix, currentPath);
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
