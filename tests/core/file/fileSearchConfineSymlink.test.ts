import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Real-filesystem regression for the confineToBaseDir backstop against a SYMLINK
// escape. A lexically in-root match can still point outside when an intermediate
// component is a symlink: a glob whose static base names a symlinked directory
// (e.g. "gateway/secret.txt" with gateway -> /outside) is read through by fast-glob
// even with followSymbolicLinks:false, and a lexical path.resolve() check does not
// catch it. confineToBaseDir must compare realpaths and drop such matches. These
// tests use a real symlink so the real realpath wiring is exercised end-to-end.
describe('searchFiles confineToBaseDir vs real symlink escape', () => {
  let root = '';
  let outside = '';

  beforeEach(async () => {
    if (process.platform === 'win32') return; // symlink creation needs privilege on Windows
    root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'confine-root-')));
    outside = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'confine-outside-')));
    await fsp.writeFile(path.join(outside, 'secret.txt'), 'HOST SECRET');
    await fsp.mkdir(path.join(root, 'src'));
    await fsp.writeFile(path.join(root, 'src', 'a.ts'), 'const x = 1;\n');
    // A symlinked directory inside root pointing outside — the escape gateway.
    await fsp.symlink(outside, path.join(root, 'gateway'), 'dir');
  });

  afterEach(async () => {
    if (process.platform === 'win32') return;
    await fsp.rm(root, { recursive: true, force: true });
    await fsp.rm(outside, { recursive: true, force: true });
  });

  test('drops a file reached through a symlinked directory base', async () => {
    if (process.platform === 'win32') return;
    const config = createMockConfig({ include: ['gateway/secret.txt'] });
    const result = await searchFiles(root, config, undefined, true);
    expect(result.filePaths).not.toContain('gateway/secret.txt');
  });

  test('drops everything a symlinked directory glob would surface', async () => {
    if (process.platform === 'win32') return;
    const config = createMockConfig({ include: ['gateway/**'] });
    const result = await searchFiles(root, config, undefined, true);
    expect(result.filePaths.some((p) => p.startsWith('gateway/'))).toBe(false);
  });

  test('still returns genuine in-root files', async () => {
    if (process.platform === 'win32') return;
    const config = createMockConfig({ include: ['src/**'] });
    const result = await searchFiles(root, config, undefined, true);
    expect(result.filePaths).toContain('src/a.ts');
  });
});
