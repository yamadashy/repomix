import { beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// Regression tests for #2023: the configured output path is a literal
// filesystem path, but it was passed to globby as an ignore pattern unescaped,
// so a name carrying glob characters matched more than itself. `{a,b}` brace
// expanded and `[1]` became a character class: the previous output stayed
// packed while unrelated source files with the expanded names vanished.

describe('fileSearch output path with glob characters (#2023)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTempDir('repomix-output-glob-chars-');
  });

  it('ignores only the brace-named output and keeps the files it would expand to', async () => {
    await writeFixture(tmpDir, {
      'context{a,b}.xml': 'previous output\n',
      'contexta.xml': 'unrelated source\n',
      'contextb.xml': 'unrelated source\n',
      'src/index.ts': 'export {};\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({ cwd: tmpDir, output: { filePath: 'context{a,b}.xml' } }),
    );

    expect(filePaths).not.toContain('context{a,b}.xml');
    expect(filePaths).toContain('contexta.xml');
    expect(filePaths).toContain('contextb.xml');
    expect(filePaths).toContain('src/index.ts');
  });

  it('ignores only the bracket-named output and keeps the file its class would match', async () => {
    await writeFixture(tmpDir, {
      'context[1].xml': 'previous output\n',
      'context1.xml': 'unrelated source\n',
      'src/index.ts': 'export {};\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({ cwd: tmpDir, output: { filePath: 'context[1].xml' } }),
    );

    expect(filePaths).not.toContain('context[1].xml');
    expect(filePaths).toContain('context1.xml');
    expect(filePaths).toContain('src/index.ts');
  });

  it('escapes a nested output path the same way', async () => {
    await writeFixture(tmpDir, {
      'docs/context{a,b}.xml': 'previous output\n',
      'docs/contexta.xml': 'unrelated source\n',
      'src/index.ts': 'export {};\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({ cwd: tmpDir, output: { filePath: 'docs/context{a,b}.xml' } }),
    );

    expect(filePaths).not.toContain('docs/context{a,b}.xml');
    expect(filePaths).toContain('docs/contexta.xml');
    expect(filePaths).toContain('src/index.ts');
  });

  it('escapes the numbered split-output pattern without escaping its part number', async () => {
    await writeFixture(tmpDir, {
      'context{a,b}.1.xml': 'previous split output\n',
      'context{a,b}.10.xml': 'previous split output\n',
      'context{a,b}.0.xml': 'user file\n',
      'contexta.1.xml': 'unrelated source\n',
      'src/index.ts': 'export {};\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({ cwd: tmpDir, output: { filePath: 'context{a,b}.xml', splitOutput: 1_000_000 } }),
    );

    expect(filePaths).not.toContain('context{a,b}.1.xml');
    expect(filePaths).not.toContain('context{a,b}.10.xml');
    expect(filePaths).toContain('context{a,b}.0.xml');
    expect(filePaths).toContain('contexta.1.xml');
    expect(filePaths).toContain('src/index.ts');
  });
});
