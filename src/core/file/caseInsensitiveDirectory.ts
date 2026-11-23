import fs from 'node:fs/promises';
import path from 'node:path';

const swapAsciiCase = (name: string): string =>
  name.replace(/[a-z]/gi, (char) => (char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase()));

// Whether name lookups in `dir` ignore case. Git matches ignore rules case-insensitively when
// `core.ignorecase` is true, which `git init` sets by probing the filesystem (it creates
// `.git/CoNfIg` and checks whether `config` finds it), so git's answer follows the filesystem:
// case-insensitive on default macOS and Windows volumes, case-sensitive on Linux.
//
// The same probe without writing anything: look up an entry of `dir` with the case of its ASCII
// letters swapped. If the swapped name is not itself listed and the lookup still finds it, the
// filesystem folds case. Directory entries are on `dir`'s own filesystem; only when `dir` has no
// usable entry is its own path tried (decided by the filesystem holding its parent), and failing
// that the platform's usual default.
export const isCaseInsensitiveDirectory = async (dir: string): Promise<boolean> => {
  const pathExists = async (filePath: string): Promise<boolean | undefined> => {
    try {
      await fs.lstat(filePath);
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      return code === 'ENOENT' || code === 'ENOTDIR' ? false : undefined;
    }
  };
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  const listed = new Set(names);
  for (const name of names) {
    const swapped = swapAsciiCase(name);
    if (swapped === name || listed.has(swapped)) continue;
    const result = await pathExists(path.join(dir, swapped));
    if (result !== undefined) return result;
  }
  for (let current = path.resolve(dir); path.dirname(current) !== current; current = path.dirname(current)) {
    const swapped = swapAsciiCase(path.basename(current));
    if (swapped === path.basename(current)) continue;
    // A missing directory says nothing about the filesystem.
    if (!(await pathExists(current))) continue;
    const result = await pathExists(path.join(path.dirname(current), swapped));
    if (result !== undefined) return result;
  }
  return process.platform === 'darwin' || process.platform === 'win32';
};
