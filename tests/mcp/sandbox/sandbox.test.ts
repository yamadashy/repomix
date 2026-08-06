import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { applySandboxOrExit, type SandboxDeps } from '../../../src/mcp/sandbox/sandbox.js';
import {
  buildRuleset,
  nodeModulesPaths,
  nodeRuntimePaths,
  nodeSharedLibDirs,
  parseLoaderTrace,
  type SandboxBackend,
  stripHostEnv,
} from '../../../src/mcp/sandbox/shared.js';

// confine() is not unit-tested — applying a real kernel sandbox would confine the
// test worker itself; e2e/mcp-sandbox/confinement.test.ts covers it out-of-process.

describe('buildRuleset', () => {
  test('puts the workspace root + node runtime in readOnly, and only the session tmp in readWrite', () => {
    const root = process.cwd(); // an existing dir, distinct from the session tmp
    const sessionTmp = os.tmpdir();
    const rs = buildRuleset(root, sessionTmp, []);

    expect(rs.readOnly).toContain(path.resolve(root));
    expect(rs.readOnly).toContain(process.execPath);
    expect(rs.readWrite).toContain(sessionTmp);
    // the readWrite set must NOT include the read-only workspace root
    expect(rs.readWrite).not.toContain(path.resolve(root));
  });

  test('includes caller-supplied system paths that exist, drops missing ones', () => {
    const rs = buildRuleset(process.cwd(), os.tmpdir(), [os.tmpdir(), '/no/such/path/xyzzy']);
    expect(rs.readOnly).toContain(os.tmpdir());
    expect(rs.readOnly).not.toContain('/no/such/path/xyzzy');
  });

  test('grants the node runtime + the node_modules resolution walk so the confined child loads its deps', () => {
    // The repo checkout has a top-level node_modules; the confined re-exec must be able
    // to read node itself + that dir (and any ancestor node_modules for a flat-hoisted
    // layout). Granted on every platform now — there is no opt-out.
    const rs = buildRuleset(process.cwd(), os.tmpdir(), []);
    expect(rs.readOnly).toContain(process.execPath);
    expect(rs.readOnly).toContain(path.join(process.cwd(), 'node_modules'));
  });
});

describe('nodeModulesPaths', () => {
  test('emits a node_modules entry for the start dir and every ancestor up to the fs root', () => {
    // path.resolve makes the input absolute against the cwd's drive on Windows
    // (D:\a\b\c), so assert against the resolved start rather than a hardcoded POSIX
    // path — the walk itself is platform-agnostic.
    const start = path.resolve('/a/b/c');
    const root = path.parse(start).root;
    const paths = nodeModulesPaths('/a/b/c');

    // First entry is the start dir's node_modules; last is the fs root's.
    expect(paths[0]).toBe(path.join(start, 'node_modules'));
    expect(paths[paths.length - 1]).toBe(path.join(root, 'node_modules'));
    // Every entry is a `<dir>/node_modules`, and each step is the parent of the last.
    for (let i = 0; i < paths.length; i++) {
      expect(paths[i].endsWith(`${path.sep}node_modules`)).toBe(true);
      if (i > 0) {
        // step i's containing dir is the parent of step (i-1)'s containing dir
        expect(path.dirname(paths[i])).toBe(path.dirname(path.dirname(paths[i - 1])));
      }
    }
  });
});

describe('nodeRuntimePaths', () => {
  test('grants the binary and its own directory, never an install prefix', () => {
    // A prefix grant would expose co-located host config and secrets (/usr/local/etc,
    // /opt/homebrew/etc), and for a node under $HOME it would expose ~/.ssh, ~/.aws.
    expect(nodeRuntimePaths('/usr/bin/node')).toEqual(['/usr/bin/node', '/usr/bin']);
    expect(nodeRuntimePaths('/usr/bin/node')).not.toContain('/usr');
    expect(nodeRuntimePaths('/opt/homebrew/bin/node')).not.toContain('/opt/homebrew');

    const home = os.homedir();
    const underHome = nodeRuntimePaths(path.join(home, 'bin', 'node'));
    expect(underHome).not.toContain(home);
    expect(underHome).toContain(path.join(home, 'bin', 'node'));
  });
});

describe('stripHostEnv', () => {
  const snapshot = { ...process.env };
  afterEach(() => {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, snapshot);
  });

  test('drops every host variable, keeps the confinement set, rebuilds PATH and HOME', () => {
    Object.assign(process.env, {
      AWS_SECRET_ACCESS_KEY: 'shhh',
      GITHUB_TOKEN: 'ghp_x',
      NPM_TOKEN: 'npm_x',
      SOME_APP_SECRET: 'nope',
      NODE_OPTIONS: '--require /tmp/evil.js',
      REPOMIX_SANDBOXED: '1',
      TMPDIR: '/tmp/session',
      TZ: 'UTC',
    });

    stripHostEnv();

    // Secrets the kernel cannot hide are gone before the server accepts a request.
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(process.env.GITHUB_TOKEN).toBeUndefined();
    expect(process.env.NPM_TOKEN).toBeUndefined();
    expect(process.env.SOME_APP_SECRET).toBeUndefined();
    expect(process.env.NODE_OPTIONS).toBeUndefined();

    // The backend's own vars survive — they are read after startup.
    expect(process.env.REPOMIX_SANDBOXED).toBe('1');
    expect(process.env.TMPDIR).toBe('/tmp/session');
    expect(process.env.TZ).toBe('UTC');

    // Rebuilt from the runtime, not inherited.
    expect(process.env.PATH).toBe(path.dirname(process.execPath));
    expect(process.env.HOME).toBe(os.homedir());
  });

  test('leaves nothing outside the confinement set, whatever the host had', () => {
    Object.assign(process.env, { WHATEVER_1: 'a', ANOTHER_ONE: 'b' });
    stripHostEnv();
    const allowed = new Set(['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'TZ', 'OPENSSL_CONF', 'LD_LIBRARY_PATH']);
    const unexpected = Object.keys(process.env).filter(
      (name) =>
        !allowed.has(name.toUpperCase()) && !name.startsWith('REPOMIX_') && name !== 'NODE_DISABLE_COMPILE_CACHE',
    );
    expect(unexpected).toEqual([]);
  });
});

// The confinement-token contract is tested in tests/shared/sandboxEnv.test.ts,
// next to its implementation.

describe('nodeSharedLibDirs', () => {
  test('parses ldd and dyld loader output into unique dirs; unresolved lines yield nothing', () => {
    const glibc = [
      '\tlinux-vdso.so.1 (0x00007ffff7fce000)',
      '\tlibc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f0b12000000)',
      '\tlibstdc++.so.6 => /usr/lib/x86_64-linux-gnu/libstdc++.so.6 (0x00007f0b11c00000)',
      '\tlibmissing.so => not found',
      '\t/lib64/ld-linux-x86-64.so.2 (0x00007f0b12400000)',
    ].join('\n');
    expect(parseLoaderTrace(glibc).sort()).toEqual(
      ['/lib/x86_64-linux-gnu', '/lib64', '/usr/lib/x86_64-linux-gnu'].sort(),
    );
    // musl shape, then the two dyld shapes (modern and older).
    expect(parseLoaderTrace('\tlibc.so => /lib/ld-musl-x86_64.so.1 (0x7f00)')).toEqual(['/lib']);
    expect(parseLoaderTrace('dyld[123]: <UUID> /usr/lib/libSystem.B.dylib')).toEqual(['/usr/lib']);
    expect(
      parseLoaderTrace('dyld: loaded: /System/Library/Frameworks/CoreFoundation.framework/CoreFoundation.dylib'),
    ).toEqual(['/System/Library/Frameworks/CoreFoundation.framework']);
    expect(parseLoaderTrace('\tstatically linked')).toEqual([]);
    expect(parseLoaderTrace('')).toEqual([]);
  });

  test('derives dirs from this host loader — real paths, never a guessed list', () => {
    const dirs = nodeSharedLibDirs(process.execPath);
    if (process.platform === 'win32') {
      // No probe: landstrip's ALL APPLICATION PACKAGES baseline covers system DLLs.
      expect(dirs).toEqual([]);
    } else {
      expect(dirs.length).toBeGreaterThan(0);
      for (const dir of dirs) expect(fs.existsSync(dir)).toBe(true);
      // Never the filesystem root, and never /etc or /proc.
      expect(dirs).not.toContain('/');
      expect(dirs.some((d) => d === '/etc' || d.startsWith('/etc/') || d.startsWith('/proc'))).toBe(false);
    }
  });
});

describe('applySandboxOrExit (fail-closed dispatch)', () => {
  // processExit that halts flow like the real never-returning exit, so we can
  // assert the process would have exited without killing the test worker.
  const throwingExit = () =>
    vi.fn((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as unknown as (code?: number) => never;

  const fakeBackend = (over: Partial<SandboxBackend> = {}): SandboxBackend => ({
    name: 'Fake',
    isAvailable: () => true,
    confine: vi.fn(() => Promise.resolve()),
    ...over,
  });

  const deps = (over: Partial<SandboxDeps>): SandboxDeps => ({
    loadBackend: () => Promise.resolve(fakeBackend()),
    isConfinedChild: () => false,
    processExit: throwingExit(),
    ...over,
  });

  test('confined child returns without confining or exiting', async () => {
    const backend = fakeBackend();
    const exit = throwingExit();
    await applySandboxOrExit(
      { root: '/ws' },
      deps({ isConfinedChild: () => true, loadBackend: () => Promise.resolve(backend), processExit: exit }),
    );
    expect(backend.confine).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  test('refuses (exit 1) when there is no backend (landstrip binary absent)', async () => {
    const exit = throwingExit();
    await expect(
      applySandboxOrExit({ root: '/ws' }, deps({ loadBackend: () => Promise.resolve(null), processExit: exit })),
    ).rejects.toThrow('exit:1');
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('refuses (exit 1) when the backend is unavailable, without confining', async () => {
    const backend = fakeBackend({ isAvailable: () => false });
    const exit = throwingExit();
    await expect(
      applySandboxOrExit({ root: '/ws' }, deps({ loadBackend: () => Promise.resolve(backend), processExit: exit })),
    ).rejects.toThrow('exit:1');
    expect(backend.confine).not.toHaveBeenCalled();
  });

  test('refuses (exit 1) when confine throws', async () => {
    const backend = fakeBackend({
      confine: vi.fn((): Promise<void> => {
        throw new Error('boom');
      }),
    });
    const exit = throwingExit();
    await expect(
      applySandboxOrExit({ root: '/ws' }, deps({ loadBackend: () => Promise.resolve(backend), processExit: exit })),
    ).rejects.toThrow('exit:1');
  });

  test('a confine() that resolves returns to the caller without exiting (test-fake path)', async () => {
    // In production confine() never resolves (it re-execs + exits); a fake that resolves
    // models the "already applied, keep serving" return path.
    const backend = fakeBackend();
    const exit = throwingExit();
    await applySandboxOrExit({ root: '/ws' }, deps({ loadBackend: () => Promise.resolve(backend), processExit: exit }));
    expect(backend.confine).toHaveBeenCalledWith('/ws');
    expect(exit).not.toHaveBeenCalled();
  });

  test('refuses (exit 1) when the backend loader REJECTS (e.g. the backend module failed to import)', async () => {
    const exit = throwingExit();
    await expect(
      applySandboxOrExit(
        { root: '/ws' },
        deps({
          loadBackend: () => Promise.reject(new Error('Cannot find module @landstrip/landstrip')),
          processExit: exit,
        }),
      ),
    ).rejects.toThrow('exit:1');
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('awaits an async confine so a rejected apply fails closed (exit 1)', async () => {
    const backend = fakeBackend({ confine: vi.fn(() => Promise.reject(new Error('async boom'))) });
    const exit = throwingExit();
    await expect(
      applySandboxOrExit({ root: '/ws' }, deps({ loadBackend: () => Promise.resolve(backend), processExit: exit })),
    ).rejects.toThrow('exit:1');
  });
});
