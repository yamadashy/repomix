import { strToU8, zipSync } from 'fflate';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// These tests target the one behavioral change this PR makes to
// processZipFile.ts: the `cliOptions` handed to `runDefaultAction` now carry
// `skipLocalConfig: true`, so a `repomix.config.*` file inside the uploaded
// archive is never imported. Everything the module does around that (temp
// directories, output copying, result mapping) is pre-existing behavior and is
// mocked out here. The end-to-end proof that the flag actually stops execution
// lives in processZipFile.configExecution.test.ts.
const {
  runDefaultActionMock,
  setLogLevelMock,
  createTempDirectoryMock,
  cleanupTempDirectoryMock,
  copyOutputToCurrentDirectoryMock,
  mkdirMock,
  writeFileMock,
  readFileMock,
  unlinkMock,
} = vi.hoisted(() => ({
  runDefaultActionMock: vi.fn(),
  setLogLevelMock: vi.fn(),
  createTempDirectoryMock: vi.fn(async () => '/tmp/repomix-test-dir'),
  cleanupTempDirectoryMock: vi.fn(async () => undefined),
  copyOutputToCurrentDirectoryMock: vi.fn(async () => undefined),
  mkdirMock: vi.fn(async () => undefined),
  writeFileMock: vi.fn(async () => undefined),
  readFileMock: vi.fn(async () => 'packed content'),
  unlinkMock: vi.fn(async () => undefined),
}));

// Extraction writes to disk for real otherwise; the archive contents are
// irrelevant to what this file asserts.
vi.mock('node:fs/promises', () => ({
  default: { mkdir: mkdirMock, writeFile: writeFileMock, readFile: readFileMock, unlink: unlinkMock },
}));

vi.mock('repomix', () => ({
  runDefaultAction: runDefaultActionMock,
  setLogLevel: setLogLevelMock,
}));

vi.mock('../src/domains/pack/utils/fileUtils.js', () => ({
  createTempDirectory: createTempDirectoryMock,
  cleanupTempDirectory: cleanupTempDirectoryMock,
  copyOutputToCurrentDirectory: copyOutputToCurrentDirectoryMock,
}));

vi.mock('../src/utils/logger.js', () => ({
  logMemoryUsage: vi.fn(),
}));

const { processZipFile } = await import('../src/domains/pack/processZipFile.js');

const successfulRunDefaultActionResult = {
  config: { output: { filePath: 'repomix-output-test.txt' } },
  packResult: {
    totalFiles: 1,
    totalCharacters: 10,
    totalTokens: 5,
    fileCharCounts: { 'index.ts': 10 },
    fileTokenCounts: { 'index.ts': 5 },
    suspiciousFilesResults: [],
  },
};

const buildZipFile = (entries: Record<string, string>, name = 'upload.zip'): File => {
  const zipped = zipSync(Object.fromEntries(Object.entries(entries).map(([p, body]) => [p, strToU8(body)])));
  return new File([zipped], name, { type: 'application/zip' });
};

describe('processZipFile — untrusted archive config handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runDefaultActionMock.mockResolvedValue(successfulRunDefaultActionResult);
    readFileMock.mockResolvedValue('packed content');
  });

  test('passes skipLocalConfig: true so an uploaded repomix.config.* is never loaded', async () => {
    await processZipFile(buildZipFile({ 'repomix.config.js': 'export default {};' }), 'xml', {});

    expect(runDefaultActionMock).toHaveBeenCalledTimes(1);
    expect(runDefaultActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ skipLocalConfig: true }),
      expect.anything(),
    );
  });

  test('passes the flag regardless of the archive contents', async () => {
    // The flag is a property of where the tree came from, not of what happens
    // to be in it — an archive with no config at all must still be packed with
    // config loading disabled, so no future upload can opt itself back in.
    await processZipFile(buildZipFile({ 'README.md': 'hello\n' }), 'xml', {});

    expect(runDefaultActionMock.mock.calls[0][2]).toMatchObject({ skipLocalConfig: true });
  });

  test('packs the extracted tree as both the target and the cwd', async () => {
    // Pinning this because it is what makes the flag necessary: the attacker
    // controls the directory that config discovery runs against.
    await processZipFile(buildZipFile({ 'README.md': 'hello\n' }), 'xml', {});

    const [directories, cwd] = runDefaultActionMock.mock.calls[0];
    expect(directories).toEqual(['/tmp/repomix-test-dir']);
    expect(cwd).toBe('/tmp/repomix-test-dir');
  });
});
