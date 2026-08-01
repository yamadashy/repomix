import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { PathScopeError, resolveWithinRoot, toVirtualPath } from '../../src/mcp/pathScope.js';

// Resolve to a platform-native absolute root (D:\allowed\dir on Windows,
// /allowed/dir on POSIX) so assertions match resolveWithinRoot's path.resolve.
const ROOT = path.resolve('/allowed/dir');
const idRealpath = async (p: string) => p as unknown as string;

describe('resolveWithinRoot', () => {
  test('"." selects the root', async () => {
    await expect(resolveWithinRoot(ROOT, '.', { realpath: idRealpath })).resolves.toBe(ROOT);
  });

  test('"" also selects the root', async () => {
    await expect(resolveWithinRoot(ROOT, '', { realpath: idRealpath })).resolves.toBe(ROOT);
  });

  test('accepts a plain relative subpath', async () => {
    await expect(resolveWithinRoot(ROOT, 'src/index.ts', { realpath: idRealpath })).resolves.toBe(
      path.join(ROOT, 'src/index.ts'),
    );
  });

  test('accepts a deep plain relative path', async () => {
    await expect(resolveWithinRoot(ROOT, 'hehe/haha/file.txt', { realpath: idRealpath })).resolves.toBe(
      path.join(ROOT, 'hehe/haha/file.txt'),
    );
  });

  test('rejects a leading slash', async () => {
    await expect(resolveWithinRoot(ROOT, '/etc/passwd', { realpath: idRealpath })).rejects.toBeInstanceOf(
      PathScopeError,
    );
  });

  test('rejects a "~" home prefix', async () => {
    await expect(resolveWithinRoot(ROOT, '~/secrets', { realpath: idRealpath })).rejects.toBeInstanceOf(PathScopeError);
  });

  test('accepts a redundant "./" prefix (still relative)', async () => {
    await expect(resolveWithinRoot(ROOT, './src/x.ts', { realpath: idRealpath })).resolves.toBe(
      path.join(ROOT, 'src/x.ts'),
    );
  });

  test('rejects ".." traversal', async () => {
    await expect(resolveWithinRoot(ROOT, '../../etc/passwd', { realpath: idRealpath })).rejects.toBeInstanceOf(
      PathScopeError,
    );
  });

  test('rejects an embedded ".." segment', async () => {
    await expect(resolveWithinRoot(ROOT, 'src/../../etc', { realpath: idRealpath })).rejects.toBeInstanceOf(
      PathScopeError,
    );
  });

  test('rejects a ".." segment even mid-path that would still resolve inside', async () => {
    // Conservative: any ".." is refused, not just net-escapes (a/b/../c stays in
    // root but is still rejected — no need to reason about resolution).
    await expect(resolveWithinRoot(ROOT, 'a/b/../c', { realpath: idRealpath })).rejects.toBeInstanceOf(PathScopeError);
  });

  test('rejects backslash traversal on every platform (split covers both separators)', async () => {
    await expect(resolveWithinRoot(ROOT, '..\\..\\secret', { realpath: idRealpath })).rejects.toBeInstanceOf(
      PathScopeError,
    );
    await expect(resolveWithinRoot(ROOT, 'src\\..\\..\\secret', { realpath: idRealpath })).rejects.toBeInstanceOf(
      PathScopeError,
    );
  });

  test('rejects a bare ".."', async () => {
    await expect(resolveWithinRoot(ROOT, '..', { realpath: idRealpath })).rejects.toBeInstanceOf(PathScopeError);
  });

  test('UNC path: rejected on Windows, a literal in-root name on POSIX (backslash is not a separator there)', async () => {
    const unc = '\\\\server\\share';
    if (process.platform === 'win32') {
      await expect(resolveWithinRoot(ROOT, unc, { realpath: idRealpath })).rejects.toBeInstanceOf(PathScopeError);
    } else {
      await expect(resolveWithinRoot(ROOT, unc, { realpath: idRealpath })).resolves.toBe(path.join(ROOT, unc));
    }
  });

  test('rejects a Windows drive-relative path ("C:foo") on every platform (path.isAbsolute misses it)', async () => {
    // Drive-relative (drive letter + colon, no separator) resolves against that drive's
    // own cwd on Windows — an escape path.isAbsolute does not catch. Rooted "C:\\x"/"C:/x"
    // stay allowed on POSIX (covered elsewhere); only the drive-RELATIVE form is refused.
    for (const p of ['C:foo', 'C:', 'C:..\\x']) {
      await expect(resolveWithinRoot(ROOT, p, { realpath: idRealpath })).rejects.toBeInstanceOf(PathScopeError);
    }
  });

  test('does NOT over-reject legitimate dotted filenames (only an exact ".." segment is traversal)', async () => {
    for (const ok of ['..foo', 'foo..bar', '...', '.hidden', 'a/...b/c', 'weird..', '~notes', '~$Report.docx']) {
      await expect(resolveWithinRoot(ROOT, ok, { realpath: idRealpath })).resolves.toBe(path.join(ROOT, ok));
    }
  });

  test('rejects a symlink that resolves to a SIBLING sharing the root as a string prefix', async () => {
    // "<root>evil" shares the prefix but is not inside "<root>/" — the boundary
    // check (root + separator) must not be fooled by the bare string prefix.
    const siblingRealpath = async (p: string) => (p === ROOT ? ROOT : (`${ROOT}evil` as unknown as string));
    await expect(resolveWithinRoot(ROOT, 'link', { realpath: siblingRealpath })).rejects.toBeInstanceOf(PathScopeError);
  });

  test('accepts a symlink that resolves to a real child inside root', async () => {
    const child = path.join(ROOT, 'sub', 'real.ts');
    const childRealpath = async (p: string) => (p === ROOT ? ROOT : (child as unknown as string));
    await expect(resolveWithinRoot(ROOT, 'link', { realpath: childRealpath })).resolves.toBe(child);
  });

  test('tolerates realpath failing on the root itself (falls back to the lexical root)', async () => {
    // If realpath can't resolve the root, fall back to the lexical root — the
    // candidate still resolves and the lexical guard already confined it.
    const candidate = path.join(ROOT, 'src', 'x.ts');
    const rootFailsRealpath = async (p: string) => {
      if (p === ROOT) throw new Error('EACCES');
      return candidate as unknown as string;
    };
    await expect(resolveWithinRoot(ROOT, 'src/x.ts', { realpath: rootFailsRealpath })).resolves.toBe(candidate);
  });

  test('rejects a symlink that escapes root (realpath resolves outside)', async () => {
    const escapingRealpath = async (p: string) => (p === ROOT ? ROOT : ('/etc/secret' as unknown as string));
    await expect(resolveWithinRoot(ROOT, 'link', { realpath: escapingRealpath })).rejects.toBeInstanceOf(
      PathScopeError,
    );
  });

  test('returns the lexical candidate when the target does not exist yet', async () => {
    const missingRealpath = async (p: string) => {
      if (p === ROOT) return ROOT;
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    };
    await expect(resolveWithinRoot(ROOT, 'new-file.ts', { realpath: missingRealpath })).resolves.toBe(
      path.join(ROOT, 'new-file.ts'),
    );
  });
});

describe('toVirtualPath', () => {
  test('root maps to "."', () => {
    expect(toVirtualPath(ROOT, ROOT)).toBe('.');
  });
  test('subpath maps to a plain relative path', () => {
    expect(toVirtualPath(ROOT, path.join(ROOT, 'src/index.ts'))).toBe('src/index.ts');
  });

  test('always emits forward slashes, even for a deep path on Windows separators', () => {
    const abs = path.join(ROOT, 'a', 'b', 'c', 'd.ts');
    expect(toVirtualPath(ROOT, abs)).toBe('a/b/c/d.ts');
  });
});
