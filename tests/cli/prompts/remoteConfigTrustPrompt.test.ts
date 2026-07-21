import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ConfirmRemoteConfigTrustDeps,
  confirmRemoteConfigTrust,
} from '../../../src/cli/prompts/remoteConfigTrustPrompt.js';
import { OperationCancelledError, RepomixError } from '../../../src/shared/errorHandle.js';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

describe('remoteConfigTrustPrompt', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Silence the trust prompt's stderr output so test logs stay clean, while still
    // allowing assertions on what the user was told.
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  const stderrOutput = () => stderrSpy.mock.calls.map((call: unknown[]) => String(call[0])).join('');

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
      lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => false, isFile: () => true }),
      realpath: vi.fn(async (target: unknown) => String(target)) as unknown as ConfirmRemoteConfigTrustDeps['realpath'],
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

    it('skips the prompt when --force is passed, but says so', async () => {
      const deps = makeDeps();
      await confirmRemoteConfigTrust({ ...baseOptions, force: true }, deps);
      expect(deps.isInteractive).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
      // --force is a broad flag, so the suppressed review must not be silent.
      expect(stderrOutput()).toContain('--force');
    });

    it('labels a .ts config as executable code', async () => {
      const deps = makeDeps({ findLocalConfigPath: vi.fn().mockResolvedValue('/repo/repomix.config.ts') });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(stderrOutput()).toContain('executable code');
    });

    it('truncates an oversized config on a byte budget', async () => {
      // 10k multi-byte characters: slicing by UTF-16 units would blow past the byte cap.
      const huge = 'あ'.repeat(10_000);
      const deps = makeDeps({ readFile: vi.fn().mockResolvedValue(huge) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      expect(output).toContain('(truncated)');
      expect(Buffer.byteLength(output, 'utf8')).toBeLessThan(16 * 1024);
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

    it('refuses a config that is a symlink', async () => {
      const deps = makeDeps({
        lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => true, isFile: () => false }),
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
      // The symlink target must never be read or shown.
      expect(deps.readFile).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('refuses a config whose real path escapes the cloned repo', async () => {
      const deps = makeDeps({
        realpath: vi.fn(async (target: unknown) =>
          String(target) === '/repo' ? '/repo' : '/etc/shadow',
        ) as unknown as ConfirmRemoteConfigTrustDeps['realpath'],
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
      expect(deps.readFile).not.toHaveBeenCalled();
    });

    it('reports a readable error when the config cannot be read', async () => {
      const deps = makeDeps({ readFile: vi.fn().mockRejectedValue(new Error('EACCES: permission denied')) });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
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
});
