import { describe, expect, test } from 'vitest';
import {
  type FileWithTokens,
  buildTokenCountStructure,
} from '../../../src/core/tokenCount/buildTokenCountStructure.js';

describe('buildTokenCountStructure', () => {
  test('should build a simple directory structure', () => {
    const files: FileWithTokens[] = [{ path: 'tests/test.txt', tokens: 3 }];
    const rootDirs = ['/project'];

    const result = buildTokenCountStructure(files, rootDirs);

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
    const rootDirs = ['/project'];

    const result = buildTokenCountStructure(files, rootDirs);

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
    const rootDirs = ['/workspace/project1', '/workspace/project2'];

    const result = buildTokenCountStructure(files, rootDirs);

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
    const rootDirs = ['/project'];

    const result = buildTokenCountStructure(files, rootDirs);

    expect(result).toEqual([]);
  });

  test('should handle files with same name in different directories', () => {
    const files: FileWithTokens[] = [
      { path: 'src/index.js', tokens: 100 },
      { path: 'tests/index.js', tokens: 50 },
    ];
    const rootDirs = ['/project'];

    const result = buildTokenCountStructure(files, rootDirs);

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
