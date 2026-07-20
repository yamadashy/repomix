import { createHash } from 'node:crypto';
import os from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ConfirmRemoteConfigTrustDeps,
  confirmRemoteConfigTrust,
  isRemoteConfigTrusted,
  markRemoteConfigTrusted,
} from '../../../src/cli/prompts/remoteConfigTrustPrompt.js';
import { OperationCancelledError, RepomixError } from '../../../src/shared/errorHandle.js';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

describe('remoteConfigTrustPrompt', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Silence the trust prompt's stderr output so test logs stay clean.
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  describe('confirmRemoteConfigTrust', () => {
    const baseOptions = {
      repoDir: '/repo',
      repoUrl: 'github.com/user/repo',
      force: false,
      stdout: false,
      hasExplicitConfig: false,
    };

    const makeDeps = (over: Partial<ConfirmRemoteConfigTrustDeps> = {}): ConfirmRemoteConfigTrustDeps => ({
      findLocalConfigPath: vi.fn().mockResolvedValue('/repo/repomix.config.json'),
      readFile: vi.fn().mockResolvedValue('{"output":{"style":"xml"}}'),
      isRemoteConfigTrusted: vi.fn().mockResolvedValue(false),
      markRemoteConfigTrusted: vi.fn().mockResolvedValue(undefined),
      isInteractive: vi.fn().mockReturnValue(true),
      loadClack: vi.fn().mockResolvedValue({
        select: vi.fn().mockResolvedValue('once'),
        isCancel: vi.fn().mockReturnValue(false),
        cancel: vi.fn(),
      }),
      ...over,
    });

    it('skips when an absolute --config is in use (hasExplicitConfig)', async () => {
      const deps = makeDeps();
      await confirmRemoteConfigTrust({ ...baseOptions, hasExplicitConfig: true }, deps);
      expect(deps.findLocalConfigPath).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('skips when the cloned repo has no config file', async () => {
      const deps = makeDeps({ findLocalConfigPath: vi.fn().mockResolvedValue(null) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('skips the prompt when --force is passed', async () => {
      const deps = makeDeps();
      await confirmRemoteConfigTrust({ ...baseOptions, force: true }, deps);
      expect(deps.isInteractive).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('trusts without prompting in a non-interactive shell', async () => {
      const deps = makeDeps({ isInteractive: vi.fn().mockReturnValue(false) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.readFile).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('skips the prompt when the exact config is already trusted', async () => {
      const deps = makeDeps({ isRemoteConfigTrusted: vi.fn().mockResolvedValue(true) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('refuses to prompt under --stdout rather than corrupt piped output', async () => {
      const deps = makeDeps();
      await expect(confirmRemoteConfigTrust({ ...baseOptions, stdout: true }, deps)).rejects.toThrow(RepomixError);
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('aborts when the user selects "No"', async () => {
      const deps = makeDeps({
        loadClack: vi.fn().mockResolvedValue({
          select: vi.fn().mockResolvedValue('no'),
          isCancel: vi.fn().mockReturnValue(false),
          cancel: vi.fn(),
        }),
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(OperationCancelledError);
      expect(deps.markRemoteConfigTrusted).not.toHaveBeenCalled();
    });

    it('aborts when the prompt is cancelled', async () => {
      const deps = makeDeps({
        loadClack: vi.fn().mockResolvedValue({
          select: vi.fn().mockResolvedValue(Symbol('cancel')),
          isCancel: vi.fn().mockReturnValue(true),
          cancel: vi.fn(),
        }),
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(OperationCancelledError);
    });

    it('proceeds without remembering when the user selects "Yes, once"', async () => {
      const deps = makeDeps(); // select defaults to 'once'
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.markRemoteConfigTrusted).not.toHaveBeenCalled();
    });

    it('remembers the config digest when the user selects "Yes, always"', async () => {
      const configBytes = '{"output":{"style":"markdown"}}';
      const deps = makeDeps({
        readFile: vi.fn().mockResolvedValue(configBytes),
        loadClack: vi.fn().mockResolvedValue({
          select: vi.fn().mockResolvedValue('always'),
          isCancel: vi.fn().mockReturnValue(false),
          cancel: vi.fn(),
        }),
      });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.markRemoteConfigTrusted).toHaveBeenCalledWith(baseOptions.repoUrl, sha256(configBytes));
    });
  });

  describe('trust store', () => {
    const myUid = os.userInfo().uid;
    const safeDirStat = { isDirectory: () => true, uid: myUid, mode: 0o700 } as unknown as Awaited<
      ReturnType<typeof import('node:fs/promises').stat>
    >;

    it('trusts a remote whose stored digest matches the config', async () => {
      const digest = sha256('config-bytes');
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', digest, {
        stat: vi.fn().mockResolvedValue(safeDirStat),
        readFile: vi.fn().mockResolvedValue(`${digest}\n`),
      });
      expect(trusted).toBe(true);
    });

    it('re-prompts (untrusted) when the stored digest differs from the current config', async () => {
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', sha256('new-config'), {
        stat: vi.fn().mockResolvedValue(safeDirStat),
        readFile: vi.fn().mockResolvedValue(sha256('old-config')),
      });
      expect(trusted).toBe(false);
    });

    it('is untrusted when no marker exists', async () => {
      const trusted = await isRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
        stat: vi.fn().mockResolvedValue(safeDirStat),
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
      });
      expect(trusted).toBe(false);
    });

    it('writes a content-pinned, 0600 marker when remembering trust', async () => {
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const digest = sha256('remembered-config');
      await markRemoteConfigTrusted('github.com/user/repo', digest, {
        mkdir: vi.fn().mockResolvedValue(undefined),
        chmod: vi.fn().mockResolvedValue(undefined),
        stat: vi.fn().mockResolvedValue(safeDirStat),
        writeFile,
      });
      expect(writeFile).toHaveBeenCalledTimes(1);
      const [markerPath, content, opts] = writeFile.mock.calls[0];
      expect(content).toBe(digest);
      expect(opts).toEqual({ mode: 0o600 });
      expect(String(markerPath)).toContain('trusted-remotes');
    });

    it.skipIf(process.platform === 'win32')(
      'refuses to write a marker into a foreign-owned trust store dir',
      async () => {
        const writeFile = vi.fn().mockResolvedValue(undefined);
        const foreignStat = { isDirectory: () => true, uid: myUid + 1, mode: 0o700 } as unknown as Awaited<
          ReturnType<typeof import('node:fs/promises').stat>
        >;
        await markRemoteConfigTrusted('github.com/user/repo', sha256('x'), {
          mkdir: vi.fn().mockResolvedValue(undefined),
          chmod: vi.fn().mockResolvedValue(undefined),
          stat: vi.fn().mockResolvedValue(foreignStat),
          writeFile,
        });
        expect(writeFile).not.toHaveBeenCalled();
      },
    );
  });
});
