import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  execGitDiff,
  execGitLog,
  execGitLogFilenames,
  execGitRevParse,
  execGitShallowClone,
  execGitVersion,
  execLsRemote,
  execLsRemoteHead,
} from '../../../src/core/git/gitCommand.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

const expectGitRemoteOpts = expect.objectContaining({
  timeout: 30000,
  env: expect.objectContaining({ GIT_TERMINAL_PROMPT: '0' }),
});

// The automatic existence probe uses a short timeout and suppresses credential prompts.
const expectGitProbeOpts = expect.objectContaining({
  timeout: 5000,
  env: expect.objectContaining({ GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }),
});

describe('gitCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('execGitLogFilenames', () => {
    test('should return filenames from git log', async () => {
      const mockOutput = `
file1.ts
file2.ts
file1.ts
file3.ts
file2.ts
`.trim();
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLogFilenames('/test/dir', 5, { execFileAsync: mockFileExecAsync });

      expect(result).toEqual(['file1.ts', 'file2.ts', 'file1.ts', 'file3.ts', 'file2.ts']);
      // core.fsmonitor= and --no-show-signature neutralize executable keys the
      // target directory's own .git/config could set (see gitCommand.ts).
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        '-c',
        'core.fsmonitor=',
        'log',
        '--no-show-signature',
        '--pretty=format:',
        '--name-only',
        '-n',
        '5',
      ]);
    });

    test('should return empty array when git command fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      const result = await execGitLogFilenames('/test/dir', 5, { execFileAsync: mockFileExecAsync });

      expect(result).toEqual([]);
      expect(logger.trace).toHaveBeenCalledWith('Failed to get git log filenames:', 'git command failed');
    });
  });

  describe('execGitDiff', () => {
    test('should return git diff output', async () => {
      const mockDiff = 'diff --git a/file.txt b/file.txt\n+new line';
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockDiff });

      const result = await execGitDiff('/test/dir', [], { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockDiff);
      // core.fsmonitor=, --no-ext-diff and --no-textconv neutralize executable
      // keys the target directory's own .git/config could set (see gitCommand.ts).
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        '-c',
        'core.fsmonitor=',
        'diff',
        '--no-ext-diff',
        '--no-textconv',
        '--no-color',
      ]);
    });

    test('should throw error when git diff fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      await expect(execGitDiff('/test/dir', [], { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'git command failed',
      );
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git diff:', 'git command failed');
    });
  });

  describe('execGitVersion', () => {
    test('should return git version output', async () => {
      const mockVersion = 'git version 2.34.1';
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockVersion });

      const result = await execGitVersion({ execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockVersion);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
    });

    test('should throw error when git version fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Command not found: git'));

      await expect(execGitVersion({ execFileAsync: mockFileExecAsync })).rejects.toThrow('Command not found: git');
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git version:', 'Command not found: git');
    });
  });

  describe('execGitRevParse', () => {
    test('should return git rev-parse output', async () => {
      const mockOutput = 'true';
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitRevParse('/test/dir', { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['-C', '/test/dir', 'rev-parse', '--is-inside-work-tree']);
    });

    test('should throw error when git rev-parse fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Not a git repository'));

      await expect(execGitRevParse('/test/dir', { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'Not a git repository',
      );
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git rev-parse:', 'Not a git repository');
    });
  });

  describe('execGitShallowClone', () => {
    // The .git removal is load-bearing for safety, not just tidiness: packing runs
    // `git log` inside the clone by default and git honors that repository's own
    // .git/config, so a retained .git would be a host command-execution vector.
    // Unlike the sibling tests this one touches a real directory, because the
    // guarantee is about what is left on disk rather than which git args ran.
    test('removes the clone .git so a cloned repository cannot supply git config', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-clone-git-'));
      await fs.mkdir(path.join(directory, '.git'), { recursive: true });
      await fs.writeFile(path.join(directory, '.git', 'config'), '[log]\n\tshowSignature = true\n');

      try {
        await execGitShallowClone('https://github.com/user/repo.git', directory, undefined, {
          execFileAsync: mockFileExecAsync,
        });

        await expect(fs.access(path.join(directory, '.git'))).rejects.toThrow();
      } finally {
        await fs.rm(directory, { recursive: true, force: true });
      }
    });

    test('should execute without branch option if not specified by user', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledWith(
        'git',
        ['clone', '--depth', '1', '--', url, directory],
        expectGitRemoteOpts,
      );
    });

    test('should throw error when git clone fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Authentication failed'));
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Authentication failed');

      expect(mockFileExecAsync).toHaveBeenCalledWith(
        'git',
        ['clone', '--depth', '1', '--', url, directory],
        expectGitRemoteOpts,
      );
    });

    test('should execute commands correctly when branch is specified', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'main';

      await execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(4);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(
        3,
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', '--end-of-options', remoteBranch],
        expectGitRemoteOpts,
      );
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(4, 'git', ['-C', directory, 'checkout', 'FETCH_HEAD']);
    });

    test('should throw error when git fetch fails', async () => {
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce('Success on first call')
        .mockResolvedValueOnce('Success on second call')
        .mockRejectedValueOnce(new Error('Authentication failed'));

      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'b188a6cb39b512a9c6da7235b880af42c78ccd0d';

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Authentication failed');
      expect(mockFileExecAsync).toHaveBeenCalledTimes(3);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenLastCalledWith(
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', '--end-of-options', remoteBranch],
        expectGitRemoteOpts,
      );
    });

    test('should handle short SHA correctly', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const shortSha = 'ce9b621';
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce('Success on first call')
        .mockResolvedValueOnce('Success on second call')
        .mockRejectedValueOnce(
          new Error(
            `Command failed: git fetch --depth 1 origin ${shortSha}\nfatal: couldn't find remote ref ${shortSha}`,
          ),
        );

      await execGitShallowClone(url, directory, shortSha, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(5);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(
        3,
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', '--end-of-options', shortSha],
        expectGitRemoteOpts,
      );
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(
        4,
        'git',
        ['-C', directory, 'fetch', 'origin'],
        expectGitRemoteOpts,
      );
      expect(mockFileExecAsync).toHaveBeenLastCalledWith('git', [
        '-C',
        directory,
        'checkout',
        '--end-of-options',
        shortSha,
      ]);
    });

    test("should throw error when remote ref is not found, and it's not due to short SHA", async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'b188a6cb39b512a9c6da7235b880af42c78ccd0d';
      const errMessage = `Command failed: git fetch --depth 1 origin ${remoteBranch}\nfatal: couldn't find remote ref ${remoteBranch}`;

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce('Success on first call')
        .mockResolvedValueOnce('Success on second call')
        .mockRejectedValueOnce(new Error(errMessage));

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow(errMessage);
      expect(mockFileExecAsync).toHaveBeenCalledTimes(3);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenLastCalledWith(
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', '--end-of-options', remoteBranch],
        expectGitRemoteOpts,
      );
    });

    test.each([
      ['--upload-pack', '--upload-pack=touch /tmp/pwned'],
      ['--config option', '--config=core.sshCommand=evil'],
      ['leading dash', '-evil'],
    ])('should reject branch/ref that could be a git option (%s)', async (_desc, remoteBranch) => {
      const mockFileExecAsync = vi.fn();
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow("Invalid branch or ref name. Name must not start with '-'");

      expect(mockFileExecAsync).not.toHaveBeenCalled();
    });
  });

  describe('execGitLog', () => {
    test('should return git log with null character separator', async () => {
      const mockOutput = `\x002024-01-01 10:00:00 +0900|Initial commit
file1.txt
file2.txt
\x002024-01-02 11:00:00 +0900|Add new feature
src/feature.ts
test/feature.test.ts`;
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLog('/test/dir', 10, '%x00', { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        '-c',
        'core.fsmonitor=',
        'log',
        '--no-show-signature',
        '--pretty=format:%x00%ad|%s',
        '--date=iso',
        '--name-only',
        '-n',
        '10',
      ]);
    });

    test('should use custom record separator when provided', async () => {
      const customSeparator = '|SEPARATOR|';
      const mockOutput = `${customSeparator}2024-01-01 10:00:00 +0900|Initial commit
file1.txt`;
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLog('/test/dir', 5, customSeparator, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        '-c',
        'core.fsmonitor=',
        'log',
        '--no-show-signature',
        `--pretty=format:${customSeparator}%ad|%s`,
        '--date=iso',
        '--name-only',
        '-n',
        '5',
      ]);
    });

    test('should throw error when git log fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      await expect(execGitLog('/test/dir', 10, '%x00', { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'git command failed',
      );
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git log:', 'git command failed');
    });

    test('should work with different separators', async () => {
      const separator = '###';
      const mockOutput = `${separator}2024-01-01 10:00:00 +0900|Test commit
file.txt`;
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLog('/test/dir', 50, separator, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        '-c',
        'core.fsmonitor=',
        'log',
        '--no-show-signature',
        `--pretty=format:${separator}%ad|%s`,
        '--date=iso',
        '--name-only',
        '-n',
        '50',
      ]);
    });
  });

  describe('validateGitUrl security checks', () => {
    test.each([
      ['--upload-pack', 'https://github.com/user/repo.git --upload-pack=evil-command'],
      ['--receive-pack', 'https://github.com/user/repo.git --receive-pack=evil-command'],
      ['--config', 'https://github.com/user/repo.git --config=core.sshCommand=evil-command'],
      ['--exec', 'https://github.com/user/repo.git --exec=evil-command'],
    ])('should reject URLs with %s parameter', async (_param, url) => {
      const mockFileExecAsync = vi.fn();
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Invalid repository URL. URL contains potentially dangerous parameters');

      expect(mockFileExecAsync).not.toHaveBeenCalled();
    });
  });

  describe('execLsRemote', () => {
    test('should return git ls-remote output', async () => {
      const mockOutput = `
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6\trefs/heads/main
b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7\trefs/heads/develop
c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8\trefs/tags/v1.0.0
`.trim();
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execLsRemote('https://github.com/user/repo.git', { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith(
        'git',
        ['ls-remote', '--heads', '--tags', '--', 'https://github.com/user/repo.git'],
        expectGitRemoteOpts,
      );
    });

    test('should throw error when git ls-remote fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      await expect(
        execLsRemote('https://github.com/user/repo.git', { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('git command failed');
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git ls-remote:', 'git command failed');
    });
  });

  describe('execLsRemoteHead', () => {
    test('should query only HEAD instead of all refs', async () => {
      const mockOutput = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6\tHEAD';
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execLsRemoteHead('https://github.com/user/repo.git', {
        execFileAsync: mockFileExecAsync,
      });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith(
        'git',
        ['ls-remote', '--', 'https://github.com/user/repo.git', 'HEAD'],
        expectGitProbeOpts,
      );
    });

    test('should throw error when git ls-remote HEAD fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('repository not found'));

      await expect(
        execLsRemoteHead('https://github.com/user/nonexistent.git', { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('repository not found');
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git ls-remote HEAD:', 'repository not found');
    });

    test('should validate URL before executing', async () => {
      const mockFileExecAsync = vi.fn();

      await expect(
        execLsRemoteHead('https://github.com/user/repo.git --upload-pack=evil-command', {
          execFileAsync: mockFileExecAsync,
        }),
      ).rejects.toThrow('Invalid repository URL. URL contains potentially dangerous parameters');
      expect(mockFileExecAsync).not.toHaveBeenCalled();
    });
  });
});

// End-to-end, nothing mocked: a real repository carrying a malicious .git/config
// is built and pushed through the real git subprocess. git honors a repository's
// own config, so without the hardening args a plain `git log` here would run the
// configured gpg.program. This proves the hardening holds against real git,
// including whichever executable-config behaviors the installed git version has.
describe('gitCommand — an untrusted repository cannot execute code through git', () => {
  const realExec = promisify(execFile);
  let workDir: string;
  let markerPath: string;

  beforeAll(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-git-untrusted-'));
  });

  afterAll(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  // A repository whose own config runs `markerPath`'s writer when git verifies a
  // signature, plus a commit crafted with a gpgsig header so a signature exists to
  // verify. `git log` alone then invokes gpg.program.
  const buildMaliciousRepo = async (repoDir: string, marker: string): Promise<void> => {
    const git = (...args: string[]) => execFileSync('git', ['-C', repoDir, ...args], { stdio: 'pipe' });
    await fs.mkdir(repoDir, { recursive: true });
    execFileSync('git', ['init', '-q', repoDir], { stdio: 'pipe' });
    git('config', 'user.email', 'a@b.c');
    git('config', 'user.name', 'a');
    await fs.writeFile(path.join(repoDir, 'f.txt'), 'hi\n');
    git('add', 'f.txt');
    git('commit', '-q', '-m', 'init');
    const tree = git('write-tree').toString().trim();

    const payload = path.join(repoDir, 'pwn.sh');
    await fs.writeFile(payload, `#!/bin/sh\ntouch ${marker}\necho '[GNUPG:] GOODSIG fake' 1>&2\nexit 0\n`);
    await fs.chmod(payload, 0o755);
    await fs.appendFile(
      path.join(repoDir, '.git', 'config'),
      `\n[log]\n\tshowSignature = true\n[gpg]\n\tprogram = ${payload}\n`,
    );

    const raw =
      `tree ${tree}\n` +
      'author a <a@b.c> 1700000000 +0000\n' +
      'committer a <a@b.c> 1700000000 +0000\n' +
      'gpgsig -----BEGIN PGP SIGNATURE-----\n \n fake\n -----END PGP SIGNATURE-----\n\nsigned\n';
    const rawPath = path.join(repoDir, 'rawc');
    await fs.writeFile(rawPath, raw);
    const commit = execFileSync('git', ['-C', repoDir, 'hash-object', '-t', 'commit', '-w', 'rawc']).toString().trim();
    git('update-ref', 'refs/heads/main', commit);
    git('symbolic-ref', 'HEAD', 'refs/heads/main');
    await fs.rm(rawPath, { force: true });
  };

  const exists = async (filePath: string): Promise<boolean> => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  test('execGitLogFilenames does not run gpg.program from the repo .git/config', async () => {
    const repoDir = await fs.mkdtemp(path.join(workDir, 'repo-'));
    markerPath = path.join(workDir, `marker-log-${path.basename(repoDir)}`);
    await buildMaliciousRepo(repoDir, markerPath);

    // Uses the real execFileAsync (no deps override), so this exercises the
    // hardened argument list against the installed git.
    const files = await execGitLogFilenames(repoDir, 100, { execFileAsync: realExec });

    expect(await exists(markerPath)).toBe(false);
    // The command still works — it lists the repository's files, it just does
    // not honor the malicious signature-verification config.
    expect(files).toContain('f.txt');
  });

  test('the same repo does execute when git runs with its config honored', async () => {
    // Positive control: proves the payload is live and reachable by `git log` on
    // this host, so the assertion above is testing the hardening and not a
    // payload that quietly stopped working on this git version.
    const repoDir = await fs.mkdtemp(path.join(workDir, 'control-'));
    const controlMarker = path.join(workDir, `marker-control-${path.basename(repoDir)}`);
    await buildMaliciousRepo(repoDir, controlMarker);

    await realExec('git', ['-C', repoDir, 'log', '--pretty=format:', '--name-only', '-n', '100']);

    expect(await exists(controlMarker)).toBe(true);
  });
});
