import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeIncludePattern, searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// fast-glob keeps a pattern's leading "./" in the paths it returns, so `--include ./src/**`
// produced "./src/b.ts". Those paths no longer matched git's change counts (sorting by
// changes silently stopped) and grew a "./" folder in the directory tree.

describe('include patterns with a leading "./"', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-include-dot-slash-'));
    await writeFixture(tmpDir, {
      'a.ts': 'export {};\n',
      'src/b.ts': 'export {};\n',
      'src/lib/c.ts': 'export {};\n',
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const search = async (include: string[]) => (await searchFiles(tmpDir, createMockConfig({ include }))).filePaths;

  it('returns the same root-relative paths as the pattern without it', async () => {
    for (const [withDot, without] of [
      ['./src/**', 'src/**'],
      ['./a.ts', 'a.ts'],
      ['./**/*.ts', '**/*.ts'],
    ]) {
      const expected = await search([without]);
      expect(expected.length).toBeGreaterThan(0);
      expect(await search([withDot])).toEqual(expected);
    }
  });

  it('accepts a repeated "./"', async () => {
    expect(await search(['././src/**'])).toEqual(await search(['src/**']));
  });

  it('keeps negated include patterns working', async () => {
    expect(await search(['./src/**', '!./src/lib/**'])).toEqual(['src/b.ts']);
  });
});

describe('normalizeIncludePattern', () => {
  it('drops leading "./" segments, after a "!" too', () => {
    expect(normalizeIncludePattern('./src/**')).toBe('src/**');
    expect(normalizeIncludePattern('././src/**')).toBe('src/**');
    expect(normalizeIncludePattern('!./src/lib/**')).toBe('!src/lib/**');
  });

  it('leaves other patterns alone', () => {
    for (const pattern of ['src/**', '**/*.ts', '../other/**', '.github/**', './', '.', '{./src,lib}/**', '']) {
      expect(normalizeIncludePattern(pattern)).toBe(pattern);
    }
  });
});
