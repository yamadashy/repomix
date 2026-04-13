import type { FileLineOffset } from '../output/fileOffsets.js';
import { formatFileOffsetAnnotation } from '../output/fileOffsets.js';
import type { FilesByRoot, TreeNode } from './fileTreeGenerate.js';
import { generateFileTree, generateMultiRootSections, sortTreeNodes } from './fileTreeGenerate.js';

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
