import { beforeEach, describe, expect, it } from 'vitest';
import { listFiles, searchFiles } from '../../../src/core/file/fileSearch.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

describe.each([false, true])('literal output paths (includeEmptyDirectories: %s)', (includeEmptyDirectories) => {
  let tmpDir: string;
  let config: ReturnType<typeof createMockConfig>;

  beforeEach(async () => {
    tmpDir = await createTempDir('repomix-output-path-spec-');
    config = createMockConfig({
      cwd: tmpDir,
      output: { includeEmptyDirectories },
      ignore: { useDefaultPatterns: false, useGitignore: false, useDotIgnore: false },
    });
  });

  it.each([
    { outputPath: 'context{a,b}.xml', unrelated: ['contexta.xml', 'contextb.xml'] },
    { outputPath: 'context[1].xml', unrelated: ['context1.xml'] },
    { outputPath: 'docs/{a,b}/context.xml', unrelated: ['docs/a/context.xml', 'docs/b/context.xml'] },
    { outputPath: 'docs/[1]/context.xml', unrelated: ['docs/1/context.xml'] },
  ])('excludes only the literal output at $outputPath', async ({ outputPath, unrelated }) => {
    config.output.filePath = outputPath;
    const expected = ['src/index.ts', ...unrelated].sort();
    await writeFixture(
      tmpDir,
      Object.fromEntries([outputPath, ...expected].map((filePath) => [filePath, 'fixture content\n'])),
    );

    const { filePaths } = await searchFiles(tmpDir, config);

    expect(filePaths.sort()).toEqual(expected);
    expect((await listFiles(tmpDir, config)).sort()).toEqual(expected);
  });

  it.each([
    {
      outputPath: 'docs/context{a,b}.xml',
      generated: ['docs/context{a,b}.1.xml', 'docs/context{a,b}.12.xml'],
      unrelated: [
        'docs/contexta.xml',
        'docs/contextb.1.xml',
        'docs/context{a,b}.0.xml',
        'docs/context{a,b}.01.xml',
        'docs/context{a,b}.notes.xml',
      ],
    },
    {
      outputPath: 'docs/[1]/context.xml',
      generated: ['docs/[1]/context.1.xml', 'docs/[1]/context.12.xml'],
      unrelated: ['docs/1/context.1.xml', 'docs/[1]/context.0.xml', 'docs/[1]/context.01.xml'],
    },
    {
      outputPath: 'docs/context.{a,b}',
      generated: ['docs/context.1.{a,b}', 'docs/context.12.{a,b}'],
      unrelated: ['docs/context.1.a', 'docs/context.12.b', 'docs/context.0.{a,b}', 'docs/context.01.{a,b}'],
    },
  ])('excludes numbered split outputs literally for $outputPath', async ({ outputPath, generated, unrelated }) => {
    config.output.filePath = outputPath;
    config.output.splitOutput = 9216;
    const expected = ['src/index.ts', ...unrelated].sort();
    await writeFixture(
      tmpDir,
      Object.fromEntries([outputPath, ...generated, ...expected].map((filePath) => [filePath, 'fixture content\n'])),
    );

    const { filePaths } = await searchFiles(tmpDir, config);

    expect(filePaths.sort()).toEqual(expected);
    expect((await listFiles(tmpDir, config)).sort()).toEqual(expected);
  });
});
