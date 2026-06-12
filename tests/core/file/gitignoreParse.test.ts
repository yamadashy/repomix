import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  applyBaseToPattern,
  convertPatternsForFastGlob,
  createIgnoreMatcher,
  parseIgnoreFile,
} from '../../../src/core/file/gitignoreParse.js';

describe('applyBaseToPattern', () => {
  test('returns the pattern unchanged when base is empty', () => {
    expect(applyBaseToPattern('*.log', '')).toBe('*.log');
    expect(applyBaseToPattern('!keep.txt', '')).toBe('!keep.txt');
  });

  test('prefixes bare names with base/** so they match at any depth below the ignore file', () => {
    expect(applyBaseToPattern('*.log', 'sub')).toBe('sub/**/*.log');
    expect(applyBaseToPattern('temp', 'sub/inner')).toBe('sub/inner/**/temp');
  });

  test('treats a trailing-slash-only pattern as a bare name (matches at any depth)', () => {
    expect(applyBaseToPattern('build/', 'sub')).toBe('sub/**/build/');
  });

  test('anchors leading-slash patterns to the ignore file directory', () => {
    expect(applyBaseToPattern('/anchored.txt', 'sub')).toBe('sub/anchored.txt');
  });

  test('anchors middle-slash patterns to the ignore file directory', () => {
    expect(applyBaseToPattern('src/foo', 'sub')).toBe('sub/src/foo');
  });

  test('preserves negation across anchoring', () => {
    expect(applyBaseToPattern('!keep.txt', 'sub')).toBe('!sub/**/keep.txt');
    expect(applyBaseToPattern('!/anchored.txt', 'sub')).toBe('!sub/anchored.txt');
  });
});

describe('parseIgnoreFile', () => {
  test('skips comments and empty lines, anchors patterns to the file location', () => {
    const file = {
      filePath: path.join('/repo', 'sub', '.gitignore'),
      content: '# comment\n\n*.log\n/anchored.txt\n',
    };
    expect(parseIgnoreFile(file, '/repo')).toEqual(['sub/**/*.log', 'sub/anchored.txt']);
  });

  test('handles CRLF line endings', () => {
    const file = {
      filePath: path.join('/repo', '.gitignore'),
      content: 'a.txt\r\nb.txt\r\n',
    };
    expect(parseIgnoreFile(file, '/repo')).toEqual(['a.txt', 'b.txt']);
  });
});

describe('createIgnoreMatcher', () => {
  test('matches files against anchored patterns', () => {
    const matcher = createIgnoreMatcher(['*.log', 'sub/**/local.txt'], '/repo', '/repo');
    expect(matcher(path.join('/repo', 'a.log')).ignored).toBe(true);
    expect(matcher(path.join('/repo', 'sub', 'inner', 'local.txt')).ignored).toBe(true);
    expect(matcher(path.join('/repo', 'keep.txt')).ignored).toBe(false);
  });

  test('honors directory-only rules via trailing separator', () => {
    const matcher = createIgnoreMatcher(['build/'], '/repo', '/repo');
    // Without a trailing separator the directory-only rule does not match...
    expect(matcher(path.join('/repo', 'build')).ignored).toBe(false);
    // ...with one it does, which is how the filter tests directories.
    expect(matcher(path.join('/repo', 'build') + path.sep).ignored).toBe(true);
  });

  test('reports unignored for negated paths', () => {
    const matcher = createIgnoreMatcher(['*.log', '!keep.log'], '/repo', '/repo');
    const result = matcher(path.join('/repo', 'keep.log'));
    expect(result.ignored).toBe(false);
    expect(result.unignored).toBe(true);
  });

  test('never ignores the cwd itself and treats paths outside the base as not ignored', () => {
    const matcher = createIgnoreMatcher(['**'], '/repo', '/repo');
    expect(matcher('/repo').ignored).toBe(false);
    expect(matcher('/elsewhere/file.txt').ignored).toBe(false);
  });

  test('applies git-root-anchored patterns to paths under a nested cwd', () => {
    // Patterns anchored at the git root (/repo), scan root at /repo/pkg.
    const matcher = createIgnoreMatcher(['pkg/**/*.secret'], '/repo/pkg', '/repo');
    expect(matcher(path.join('/repo', 'pkg', 'x.secret')).ignored).toBe(true);
    expect(matcher(path.join('/repo', 'pkg', 'x.txt')).ignored).toBe(false);
  });
});

describe('convertPatternsForFastGlob', () => {
  test('returns empty when negations are present', () => {
    expect(convertPatternsForFastGlob(['*.log', '!keep.log'], false)).toEqual([]);
  });

  test('returns empty when patterns are anchored to a git root above cwd', () => {
    expect(convertPatternsForFastGlob(['*.log'], true)).toEqual([]);
  });

  test('normalizes trailing-slash directory patterns for fast-glob', () => {
    expect(convertPatternsForFastGlob(['build/', 'sub/dist/', '*.tmp'], false)).toEqual([
      '**/build/**',
      'sub/dist/**',
      '*.tmp',
    ]);
  });

  test('handles the bare globstar trailing-slash special case', () => {
    expect(convertPatternsForFastGlob(['**/'], false)).toEqual(['**/**']);
  });
});
