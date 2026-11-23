import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { isCaseInsensitiveDirectory } from '../../../src/core/file/caseInsensitiveDirectory.js';

const swapCase = (value: string): string =>
  value.replace(/[a-z]/gi, (char) => (char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase()));

// The directory with the case of its own name swapped, which the fallback looks up.
const swapLastComponent = (dir: string): string => path.join(path.dirname(dir), swapCase(path.basename(dir)));

const exists = (filePath: string): Promise<boolean> =>
  fs.lstat(filePath).then(
    () => true,
    () => false,
  );

describe('isCaseInsensitiveDirectory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-case-probe-')));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // The expectations are the filesystem's own answer, so these hold on case-sensitive and
  // case-insensitive filesystems alike.
  test('finds an entry under its swapped case exactly on a case-folding filesystem', async () => {
    await fs.writeFile(path.join(tempDir, 'Probe.txt'), '');
    expect(await isCaseInsensitiveDirectory(tempDir)).toBe(await exists(path.join(tempDir, 'pROBE.TXT')));
  });

  test('skips entries without letters and falls back to the directory path', async () => {
    await fs.writeFile(path.join(tempDir, '123'), '');
    expect(await isCaseInsensitiveDirectory(tempDir)).toBe(await exists(swapLastComponent(tempDir)));
  });

  test('skips entries whose swapped name is listed too', async () => {
    await fs.writeFile(path.join(tempDir, 'Probe.txt'), '');
    const caseSensitive = !(await exists(path.join(tempDir, 'pROBE.TXT')));
    if (caseSensitive) {
      // Both spellings exist, so they prove nothing; the probe moves on to another entry.
      await fs.writeFile(path.join(tempDir, 'pROBE.TXT'), '');
      await fs.writeFile(path.join(tempDir, 'Other'), '');
    }
    expect(await isCaseInsensitiveDirectory(tempDir)).toBe(!caseSensitive);
  });

  test('skips missing directories on the way up', async () => {
    const missing = path.join(tempDir, 'does-not-exist', 'either');
    // The walk up reaches the existing temporary directory, whose path decides.
    expect(await isCaseInsensitiveDirectory(missing)).toBe(await exists(swapLastComponent(tempDir)));
  });
});
