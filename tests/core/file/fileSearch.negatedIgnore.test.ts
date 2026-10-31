import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getIgnorePatterns, searchFiles } from '../../../src/core/file/fileSearch.js';
import { logger } from '../../../src/shared/logger.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// fast-glob does not support `!` re-inclusion in its ignore list and would exclude the
// negated file instead. Negated custom patterns are skipped with a warning until #400 is done.
// The warning is deduplicated per process, so each test uses its own distinct pattern.

describe('negated custom ignore patterns', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-negated-ignore-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('keeps the negated file packed instead of excluding it', async () => {
    await writeFixture(tmpDir, {
      'main.ts': 'export {};\n',
      'other.ts': 'export {};\n',
    });
    vi.spyOn(logger, 'warn').mockImplementation(() => {});

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { customPatterns: ['!main.ts'] } }));

    expect(filePaths).toEqual(['main.ts', 'other.ts']);
  });

  it('does not return negated patterns and warns once across multiple calls', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const config = createMockConfig({ ignore: { customPatterns: ['!once-only.ts'] } });

    const first = await getIgnorePatterns(tmpDir, config);
    await getIgnorePatterns(tmpDir, config);
    await getIgnorePatterns(tmpDir, config);

    expect(first).not.toContain('!once-only.ts');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"!once-only.ts"');
    expect(warn.mock.calls[0][0]).toContain('issues/400');
  });

  it('passes escaped literal "!" patterns and normal patterns through unchanged', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const config = createMockConfig({ ignore: { customPatterns: ['\\!foo', '*.log', '!escaped-check.ts'] } });

    const patterns = await getIgnorePatterns(tmpDir, config);

    expect(patterns).toContain('\\!foo');
    expect(patterns).toContain('*.log');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps extglob patterns such as !(*.ts) as ignore patterns', async () => {
    await writeFixture(tmpDir, {
      'a.ts': 'export {};\n',
      'b.md': '# b\n',
    });
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { customPatterns: ['!(*.ts)'] } }));

    expect(filePaths).toEqual(['a.ts']);
    expect(warn).not.toHaveBeenCalled();
  });
});
