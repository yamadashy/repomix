import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig, isWindows, writeFixture } from '../../testing/testUtils.js';

describe('fileSearch stdin paths', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTempDir('repomix-stdin-');
  });

  it('finds explicit nested files while preserving glob escaping and ignore rules', async () => {
    await writeFixture(tmpDir, {
      'root.ts': 'export {};\n',
      'src/deep/module.ts': 'export {};\n',
      'src/(routes)/page[1].ts': 'export {};\n',
      'src/ignored.ts': 'export {};\n',
      'src/unlisted.ts': 'export {};\n',
    });
    const explicitFiles = ['root.ts', 'src/deep/module.ts', 'src/(routes)/page[1].ts', 'src/ignored.ts'].map(
      (filePath) => path.join(tmpDir, filePath),
    );
    const config = createMockConfig({
      cwd: tmpDir,
      ignore: { customPatterns: ['src/ignored.ts'] },
    });

    const { filePaths } = await searchFiles(tmpDir, config, explicitFiles);

    expect(filePaths.sort()).toEqual(['root.ts', 'src/(routes)/page[1].ts', 'src/deep/module.ts']);
  });

  (isWindows ? it.skip : it)('preserves literal backslashes in POSIX file names', async () => {
    await writeFixture(tmpDir, {
      'src/back\\slash.ts': 'export const literal = true;\n',
      'src/back/slash.ts': 'export const nested = true;\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ cwd: tmpDir }), [
      path.join(tmpDir, 'src/back\\slash.ts'),
    ]);

    expect(filePaths).toEqual(['src/back\\slash.ts']);
  });
});
