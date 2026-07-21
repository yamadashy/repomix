import { createHash } from 'node:crypto';
import os from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRemoteConfigTrusted, markRemoteConfigTrusted } from '../../../src/cli/prompts/remoteConfigTrustStore.js';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

describe('remoteConfigTrustStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // The store reports persistence problems on stderr; keep test logs clean.
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  describe('trust store', () => {
    const myUid = os.userInfo().uid;
    type DirStats = Awaited<ReturnType<typeof import('node:fs/promises').lstat>>;
    const makeStats = (over: Partial<{ isDirectory: boolean; isSymbolicLink: boolean; uid: number; mode: number }>) =>
      ({
        isDirectory: () => over.isDirectory ?? true,
        isSymbolicLink: () => over.isSymbolicLink ?? false,
        uid: over.uid ?? myUid,
        mode: over.mode ?? 0o700,
      }) as unknown as DirStats;

    const safeDirStat = makeStats({});

    it('trusts a remote whose stored digest matches the config', async () => {
      const digest = sha256('config-bytes');
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', digest, {
        lstat: vi.fn().mockResolvedValue(safeDirStat),
        readFile: vi.fn().mockResolvedValue(`${digest}\n`),
      });
      expect(trusted).toBe(true);
    });

    it('re-prompts (untrusted) when the stored digest differs from the current config', async () => {
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', sha256('new-config'), {
        lstat: vi.fn().mockResolvedValue(safeDirStat),
        readFile: vi.fn().mockResolvedValue(sha256('old-config')),
      });
      expect(trusted).toBe(false);
    });

    it('resolves different spellings of the same remote to one marker', async () => {
      // Trust is keyed on the canonical clone URL. If shorthand and the full https
      // form landed on different markers, a repo could dodge an approved pin simply
      // by being referenced another way — and each spelling would re-prompt.
      const digest = sha256('config-bytes');
      const readFile = vi.fn().mockResolvedValue(digest);
      const markerFor = async (url: string) => {
        readFile.mockClear();
        await isRemoteConfigTrusted(url, digest, { lstat: vi.fn().mockResolvedValue(safeDirStat), readFile });
        return readFile.mock.calls[0][0] as string;
      };

      const shorthand = await markerFor('user/repo');
      expect(await markerFor('https://github.com/user/repo')).toBe(shorthand);
      expect(await markerFor('https://github.com/user/repo.git')).toBe(shorthand);
      // A different repository must not share it.
      expect(await markerFor('user/other-repo')).not.toBe(shorthand);
    });

    it('is untrusted when no marker exists', async () => {
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
        lstat: vi.fn().mockResolvedValue(safeDirStat),
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
      });
      expect(trusted).toBe(false);
    });

    it('is untrusted when the trust store path is not a directory', async () => {
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
        lstat: vi.fn().mockResolvedValue(makeStats({ isDirectory: false })),
        readFile: vi.fn().mockResolvedValue(sha256('x')),
      });
      expect(trusted).toBe(false);
    });

    it('is untrusted when the trust store cannot be stat-ed', async () => {
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
        lstat: vi.fn().mockRejectedValue(new Error('ENOENT')),
        readFile: vi.fn().mockResolvedValue(sha256('x')),
      });
      expect(trusted).toBe(false);
    });

    it.skipIf(process.platform === 'win32')(
      'refuses to honor a marker in a foreign-owned store dir (read path)',
      async () => {
        // The seeding attack: another local user plants a marker whose digest matches.
        const digest = sha256('config-bytes');
        const trusted = await isRemoteConfigTrusted('github.com/user/repo', digest, {
          lstat: vi.fn().mockResolvedValue(makeStats({ uid: myUid + 1 })),
          readFile: vi.fn().mockResolvedValue(digest),
        });
        expect(trusted).toBe(false);
      },
    );

    it.skipIf(process.platform === 'win32')(
      'refuses to honor a marker in a world-writable store dir (read path)',
      async () => {
        const digest = sha256('config-bytes');
        const trusted = await isRemoteConfigTrusted('github.com/user/repo', digest, {
          lstat: vi.fn().mockResolvedValue(makeStats({ mode: 0o777 })),
          readFile: vi.fn().mockResolvedValue(digest),
        });
        expect(trusted).toBe(false);
      },
    );

    it.skipIf(process.platform === 'win32')(
      'checks the parent umbrella as well as the trusted-remotes subdir',
      async () => {
        const digest = sha256('config-bytes');
        // First lstat is $TMPDIR/repomix (unsafe), second is trusted-remotes (safe).
        const lstat = vi
          .fn()
          .mockResolvedValueOnce(makeStats({ mode: 0o777 }))
          .mockResolvedValueOnce(makeStats({}));
        const trusted = await isRemoteConfigTrusted('github.com/user/repo', digest, {
          lstat,
          readFile: vi.fn().mockResolvedValue(digest),
        });
        expect(trusted).toBe(false);
      },
    );

    it('writes a content-pinned, 0600 marker when remembering trust', async () => {
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const chmod = vi.fn().mockResolvedValue(undefined);
      const mkdir = vi.fn().mockResolvedValue(undefined);
      const digest = sha256('remembered-config');
      await markRemoteConfigTrusted('github.com/user/repo', digest, {
        mkdir,
        chmod,
        lstat: vi.fn().mockResolvedValue(safeDirStat),
        writeFile,
      });
      expect(writeFile).toHaveBeenCalledTimes(1);
      const [markerPath, content, opts] = writeFile.mock.calls[0];
      expect(content).toBe(digest);
      expect(opts).toEqual({ mode: 0o600 });
      expect(String(markerPath)).toContain('trusted-remotes');
      // mkdir does not tighten an existing directory, so the explicit chmod is what
      // keeps a pre-existing loose store dir from staying group/world-writable.
      expect(chmod).toHaveBeenCalledWith(expect.stringContaining('trusted-remotes'), 0o700);
      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('trusted-remotes'), { recursive: true, mode: 0o700 });
    });

    it('never aborts the run when persisting the marker fails', async () => {
      await expect(
        markRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
          mkdir: vi.fn().mockResolvedValue(undefined),
          chmod: vi.fn().mockResolvedValue(undefined),
          lstat: vi.fn().mockResolvedValue(safeDirStat),
          writeFile: vi.fn().mockRejectedValue(new Error('ENOSPC: no space left on device')),
        }),
      ).resolves.toBeUndefined();
    });

    it.skipIf(process.platform === 'win32')('refuses to touch a symlinked trust store dir', async () => {
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const chmod = vi.fn().mockResolvedValue(undefined);
      await markRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
        mkdir: vi.fn().mockResolvedValue(undefined),
        chmod,
        lstat: vi.fn().mockResolvedValue(makeStats({ isSymbolicLink: true })),
        writeFile,
      });
      // Neither the chmod nor the write may follow the symlink.
      expect(chmod).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });

    it.skipIf(process.platform === 'win32')(
      'refuses to write a marker into a foreign-owned trust store dir',
      async () => {
        const writeFile = vi.fn().mockResolvedValue(undefined);
        await markRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
          mkdir: vi.fn().mockResolvedValue(undefined),
          chmod: vi.fn().mockResolvedValue(undefined),
          lstat: vi.fn().mockResolvedValue(makeStats({ uid: myUid + 1 })),
          writeFile,
        });
        expect(writeFile).not.toHaveBeenCalled();
      },
    );

    it.skipIf(process.platform === 'win32')('refuses a world-writable trust store dir', async () => {
      const writeFile = vi.fn().mockResolvedValue(undefined);
      await markRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
        mkdir: vi.fn().mockResolvedValue(undefined),
        chmod: vi.fn().mockResolvedValue(undefined),
        lstat: vi.fn().mockResolvedValue(makeStats({ mode: 0o777 })),
        writeFile,
      });
      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});
