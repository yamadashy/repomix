import { describe, expect, test } from 'vitest';
import {
  buildTokenCountTree,
  type FileWithTokens,
  type TokenCountTreeNode,
} from '../../../src/core/tokenCount/buildTokenCountStructure.js';
import type { DirectoryTokenInfo, TokenCountOutput } from '../../../src/core/tokenCount/types.js';

const convertToOutput = (node: TokenCountTreeNode, isRoot = true): TokenCountOutput => {
  const result: DirectoryTokenInfo[] = [];

  // Handle directories
  for (const [name, child] of Object.entries(node.children)) {
    const dirInfo: DirectoryTokenInfo = {
      name,
      files: child.files,
    };

    // Check for subdirectories
    const subdirs = convertToOutput(child, false);
    if (subdirs.length > 0) {
      dirInfo.directories = subdirs;
    }

    result.push(dirInfo);
  }

  // Handle root-level files (only at the actual root level)
  if (isRoot) {
    for (const file of node.files) {
      result.push({
        name: file.name,
        files: [file],
      });
    }
  }

  return result;
};

const buildTokenCountStructure = (filesWithTokens: FileWithTokens[]): TokenCountOutput => {
  const root = buildTokenCountTree(filesWithTokens);
  return convertToOutput(root);
};

describe('buildTokenCountStructure', () => {
  test('should build a simple directory structure', () => {
    const files: FileWithTokens[] = [{ path: 'tests/test.txt', tokens: 3 }];

    const result = buildTokenCountStructure(files);

    expect(result).toEqual([
      {
        name: 'tests',
        files: [{ name: 'test.txt', tokens: 3 }],
      },
    ]);
  });

  test('should handle nested directory structure', () => {
    const files: FileWithTokens[] = [
      { path: 'src/components/Button.js', tokens: 100 },
      { path: 'src/components/Card.js', tokens: 150 },
      { path: 'src/utils/format.js', tokens: 50 },
      { path: 'README.md', tokens: 30 },
    ];

    const result = buildTokenCountStructure(files);

    expect(result).toEqual([
      {
        name: 'src',
        files: [],
        directories: [
          {
            name: 'components',
            files: [
              { name: 'Button.js', tokens: 100 },
              { name: 'Card.js', tokens: 150 },
            ],
          },
          {
            name: 'utils',
            files: [{ name: 'format.js', tokens: 50 }],
          },
        ],
      },
      {
        name: 'README.md',
        files: [{ name: 'README.md', tokens: 30 }],
      },
    ]);
  });

  test('should handle multiple root directories', () => {
    const files: FileWithTokens[] = [
      { path: 'file1.js', tokens: 10 },
      { path: 'file2.js', tokens: 20 },
    ];

    const result = buildTokenCountStructure(files);

    expect(result).toEqual([
      {
        name: 'file1.js',
        files: [{ name: 'file1.js', tokens: 10 }],
      },
      {
        name: 'file2.js',
        files: [{ name: 'file2.js', tokens: 20 }],
      },
    ]);
  });

  test('should handle empty file list', () => {
    const files: FileWithTokens[] = [];

    const result = buildTokenCountStructure(files);

    expect(result).toEqual([]);
  });

  test('should include underscore-prefixed directories like __tests__ in token sums', () => {
    const files: FileWithTokens[] = [
      { path: 'src/__tests__/foo.test.ts', tokens: 100 },
      { path: 'src/index.ts', tokens: 50 },
    ];

    const tree = buildTokenCountTree(files);
    const src = tree.children.src;

    // The __tests__ subtree must roll up into its ancestors' sums, and a directory
    // whose name starts with '_' must live in `children` like any other directory.
    expect(tree.tokenSum).toBe(150);
    expect(src.tokenSum).toBe(150);
    expect(src.children.__tests__.tokenSum).toBe(100);
  });

  test('should handle files with same name in different directories', () => {
    const files: FileWithTokens[] = [
      { path: 'src/index.js', tokens: 100 },
      { path: 'tests/index.js', tokens: 50 },
    ];

    const result = buildTokenCountStructure(files);

    expect(result).toEqual([
      {
        name: 'src',
        files: [{ name: 'index.js', tokens: 100 }],
      },
      {
        name: 'tests',
        files: [{ name: 'index.js', tokens: 50 }],
      },
    ]);
  });
});
