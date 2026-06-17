import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildWatchIgnoreFilter } from '../../../../src/cli/actions/watch/watchIgnore.js';
import { createMockConfig, isWindows } from '../../../testing/testUtils.js';

describe('buildWatchIgnoreFilter', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    // Real filesystem + real timers: the builder reads .gitignore via globby, which
    // needs a .git directory present to anchor gitignore resolution.
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-watch-ignore-'));
    await fs.mkdir(path.join(tmpRoot, '.git'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'node_modules', 'pkg'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'build-cache'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'src'), { recursive: true });
    await fs.writeFile(path.join(tmpRoot, '.gitignore'), 'build-cache/\n');
    await fs.writeFile(path.join(tmpRoot, 'src', 'index.ts'), 'export const a = 1;\n');
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  const buildFilter = async () => {
    const config = createMockConfig({
      cwd: tmpRoot,
      output: { filePath: 'repomix-output.xml' },
      ignore: { useGitignore: true, useDefaultPatterns: true, useDotIgnore: true, customPatterns: [] },
    });
    return buildWatchIgnoreFilter([tmpRoot], config);
  };

  it('ignores default-pattern directories themselves so chokidar never descends (EMFILE guard)', async () => {
    const ignored = await buildFilter();
    expect(ignored(path.join(tmpRoot, 'node_modules'))).toBe(true);
    expect(ignored(path.join(tmpRoot, 'node_modules', 'pkg', 'index.js'))).toBe(true);
    expect(ignored(path.join(tmpRoot, '.git'))).toBe(true);
  });

  // globby's gitignore resolution behaves differently on Windows, so this case is
  // skipped there (mirrors the .gitignore tests in fileSearch.test.ts).
  it.runIf(!isWindows)('ignores gitignored directories themselves, not just their descendants', async () => {
    const ignored = await buildFilter();
    expect(ignored(path.join(tmpRoot, 'build-cache'))).toBe(true);
    expect(ignored(path.join(tmpRoot, 'build-cache', 'cached.tmp'))).toBe(true);
  });

  it('ignores the output file path', async () => {
    const ignored = await buildFilter();
    expect(ignored(path.join(tmpRoot, 'repomix-output.xml'))).toBe(true);
  });

  it('does not ignore real source files', async () => {
    const ignored = await buildFilter();
    expect(ignored(path.join(tmpRoot, 'src', 'index.ts'))).toBe(false);
  });

  it('normalizes trailing-slash custom patterns so the directory is pruned', async () => {
    const config = createMockConfig({
      cwd: tmpRoot,
      ignore: { useGitignore: false, useDefaultPatterns: true, useDotIgnore: false, customPatterns: ['cachedir/'] },
    });
    const ignored = await buildWatchIgnoreFilter([tmpRoot], config);
    // `cachedir/` is normalized to `cachedir` (matching the packer), so the directory itself
    // matches and chokidar prunes it instead of descending.
    expect(ignored(path.join(tmpRoot, 'cachedir'))).toBe(true);
  });

  it('still applies ignore rules to in-root directories whose name starts with ".."', async () => {
    const config = createMockConfig({
      cwd: tmpRoot,
      ignore: { useGitignore: false, useDefaultPatterns: true, useDotIgnore: false, customPatterns: ['..cache/**'] },
    });
    const ignored = await buildWatchIgnoreFilter([tmpRoot], config);
    // `..cache` is a real directory inside the root, not a parent traversal. The outside-root
    // guard must not treat it as `..` and skip it, otherwise its ignore rule is never applied.
    expect(ignored(path.join(tmpRoot, '..cache', 'file.ts'))).toBe(true);
  });

  it('checks all roots for nested or overlapping watched directories', async () => {
    const sub = path.join(tmpRoot, 'sub');
    await fs.mkdir(sub, { recursive: true });
    const config = createMockConfig({
      cwd: tmpRoot,
      ignore: { useGitignore: false, useDefaultPatterns: true, useDotIgnore: false, customPatterns: ['anchored/**'] },
    });
    const ignored = await buildWatchIgnoreFilter([tmpRoot, sub], config);
    // `anchored/**` is anchored: relative to the outer root the path is `sub/anchored/...`
    // (no match), but relative to the nested root it is `anchored/...` (match). The predicate
    // must keep checking roots instead of stopping at the first one that contains the path.
    expect(ignored(path.join(sub, 'anchored', 'file.txt'))).toBe(true);
  });
});
