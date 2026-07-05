import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PackOptions, PackResult } from '../src/types.js';
import { AppError } from '../src/utils/errorHandler.js';

// These tests target the one behavioral change this PR makes to remoteRepo.ts:
// `processRemoteRepo` now calls `assertPublicHttpsRepoUrl(parsed.repoUrl)` right
// after `parseRemoteValue`, and before any temp directory / git clone side
// effects. Everything else in the module (caching, cloning, packing, error
// wrapping) is pre-existing behavior and out of scope here, so all of that is
// mocked out to isolate the new validation call.
const {
  execFileMock,
  parseRemoteValueMock,
  runDefaultActionMock,
  assertPublicHttpsRepoUrlMock,
  cacheGetMock,
  cacheSetMock,
  createTempDirectoryMock,
  cleanupTempDirectoryMock,
  copyOutputToCurrentDirectoryMock,
  generateCacheKeyMock,
  readFileMock,
  unlinkMock,
} = vi.hoisted(() => ({
  execFileMock: vi.fn((_file: string, _args: string[], _options: unknown, callback: (error: Error | null) => void) => {
    callback(null);
  }),
  parseRemoteValueMock: vi.fn(),
  runDefaultActionMock: vi.fn(),
  assertPublicHttpsRepoUrlMock: vi.fn(async () => undefined),
  cacheGetMock: vi.fn(async (): Promise<PackResult | undefined> => undefined),
  cacheSetMock: vi.fn(async () => undefined),
  createTempDirectoryMock: vi.fn(async () => '/tmp/repomix-test-dir'),
  cleanupTempDirectoryMock: vi.fn(async () => undefined),
  copyOutputToCurrentDirectoryMock: vi.fn(async () => undefined),
  generateCacheKeyMock: vi.fn(() => 'cache-key'),
  readFileMock: vi.fn(async () => 'packed content'),
  unlinkMock: vi.fn(async () => undefined),
}));

// git clone itself — must never run before validation passes.
vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

// Only `readFile`/`unlink` from fs/promises are touched by remoteRepo.ts.
vi.mock('node:fs/promises', () => ({
  default: { readFile: readFileMock, unlink: unlinkMock },
  readFile: readFileMock,
  unlink: unlinkMock,
}));

vi.mock('repomix', () => ({
  parseRemoteValue: parseRemoteValueMock,
  runDefaultAction: runDefaultActionMock,
}));

vi.mock('../src/utils/logger.js', () => ({
  logMemoryUsage: vi.fn(),
}));

vi.mock('../src/domains/pack/utils/cache.js', () => ({
  generateCacheKey: generateCacheKeyMock,
}));

vi.mock('../src/domains/pack/utils/fileUtils.js', () => ({
  createTempDirectory: createTempDirectoryMock,
  cleanupTempDirectory: cleanupTempDirectoryMock,
  copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
}));

vi.mock('../src/domains/pack/utils/sharedInstance.js', () => ({
  cache: { get: cacheGetMock, set: cacheSetMock },
}));

// The module under test's own dependency — controlled per-test below to
// exercise both the "allowed" and "blocked" branches deterministically.
vi.mock('../src/domains/pack/validateRemoteRepoUrl.js', () => ({
  assertPublicHttpsRepoUrl: assertPublicHttpsRepoUrlMock,
}));

const { processRemoteRepo } = await import('../src/domains/pack/remoteRepo.js');

const baseOptions: PackOptions = {};

const successfulRunDefaultActionResult = {
  config: { output: { filePath: 'repomix-output-test.txt' } },
  packResult: {
    totalFiles: 1,
    totalCharacters: 10,
    totalTokens: 5,
    fileCharCounts: { 'index.ts': 10 },
    fileTokenCounts: { 'index.ts': 5 },
  },
};

describe('processRemoteRepo — assertPublicHttpsRepoUrl integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheGetMock.mockResolvedValue(undefined);
    parseRemoteValueMock.mockReturnValue({ repoUrl: 'https://github.com/owner/repo.git', remoteBranch: undefined });
    assertPublicHttpsRepoUrlMock.mockResolvedValue(undefined);
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(null);
    });
    runDefaultActionMock.mockResolvedValue(successfulRunDefaultActionResult);
    readFileMock.mockResolvedValue('packed content');
  });

  test('validates the git-url-parse-normalized URL, not the raw user input', async () => {
    parseRemoteValueMock.mockReturnValue({ repoUrl: 'https://github.com/owner/repo.git', remoteBranch: 'main' });

    await processRemoteRepo('owner/repo', 'xml', baseOptions);

    // The security-relevant contract: validation must run on `parsed.repoUrl`
    // (what git will actually receive), not on the raw, possibly-shorthand
    // `repoUrl` argument.
    expect(assertPublicHttpsRepoUrlMock).toHaveBeenCalledTimes(1);
    expect(assertPublicHttpsRepoUrlMock).toHaveBeenCalledWith('https://github.com/owner/repo.git');
  });

  test('rejects and never touches the filesystem or git when the URL is blocked (SSRF/LFI)', async () => {
    const rejection = new AppError('Invalid repository URL. Only public https:// repository URLs are allowed.', 400);
    assertPublicHttpsRepoUrlMock.mockRejectedValue(rejection);
    parseRemoteValueMock.mockReturnValue({ repoUrl: 'file:///etc/passwd', remoteBranch: undefined });

    await expect(processRemoteRepo('file:///etc/passwd', 'xml', baseOptions)).rejects.toBe(rejection);

    // No side effects: the check happens before temp-dir creation and before
    // `git clone` is ever invoked.
    expect(createTempDirectoryMock).not.toHaveBeenCalled();
    expect(execFileMock).not.toHaveBeenCalled();
    expect(runDefaultActionMock).not.toHaveBeenCalled();
    expect(cleanupTempDirectoryMock).not.toHaveBeenCalled();
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  test('propagates the AppError (status code + message) from assertPublicHttpsRepoUrl unchanged', async () => {
    const rejection = new AppError('Invalid repository URL. Only public https:// repository URLs are allowed.', 400);
    assertPublicHttpsRepoUrlMock.mockRejectedValue(rejection);

    await expect(
      processRemoteRepo('http://169.254.169.254/latest/meta-data', 'xml', baseOptions),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid repository URL. Only public https:// repository URLs are allowed.',
    });
  });

  test('validation runs before git clone on the success path', async () => {
    const callOrder: string[] = [];
    assertPublicHttpsRepoUrlMock.mockImplementation(async () => {
      callOrder.push('validate');
    });
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callOrder.push('clone');
      callback(null);
    });

    await processRemoteRepo('owner/repo', 'xml', baseOptions);

    expect(callOrder).toEqual(['validate', 'clone']);
  });

  test('skips validation entirely on a cache hit', async () => {
    const cachedResult = {
      content: 'cached',
      format: 'xml',
      metadata: { repository: 'owner/repo', timestamp: new Date().toISOString() },
    };
    cacheGetMock.mockResolvedValue(cachedResult);

    const result = await processRemoteRepo('owner/repo', 'xml', baseOptions);

    expect(result).toEqual({ result: cachedResult, cached: true });
    // A cache hit returns before `parseRemoteValue`/validation ever run —
    // no reason to re-validate a URL that was already cloned successfully
    // when it was first cached.
    expect(parseRemoteValueMock).not.toHaveBeenCalled();
    expect(assertPublicHttpsRepoUrlMock).not.toHaveBeenCalled();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  test('proceeds to clone and pack when the parsed URL passes validation', async () => {
    const result = await processRemoteRepo('owner/repo', 'xml', baseOptions);

    expect(assertPublicHttpsRepoUrlMock).toHaveBeenCalledTimes(1);
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(result.cached).toBe(false);
    expect(result.result.content).toBe('packed content');
  });

  test('hardens git clone against redirect-based SSRF and non-https protocols', async () => {
    await processRemoteRepo('owner/repo', 'xml', baseOptions);

    const gitArgs = execFileMock.mock.calls[0][1] as string[];
    // A public https host that passes validation could still 3xx-redirect git to
    // an internal target; these flags stop git from following that redirect or
    // switching to a non-https protocol (file:// / ext:: …).
    expect(gitArgs).toEqual(
      expect.arrayContaining([
        '-c',
        'http.followRedirects=false',
        '-c',
        'protocol.allow=never',
        '-c',
        'protocol.https.allow=always',
      ]),
    );
    // The hardening config must precede the `clone` subcommand to take effect.
    expect(gitArgs.indexOf('http.followRedirects=false')).toBeLessThan(gitArgs.indexOf('clone'));
  });
});
