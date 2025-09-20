import { beforeEach, describe, expect, test, vi } from 'vitest';
import { reportSkippedFiles } from '../../src/cli/cliReport.js';
import type { SkippedFileInfo } from '../../src/core/file/fileCollect.js';
import { logger } from '../../src/shared/logger.js';

vi.mock('../../src/shared/logger');

describe('reportSkippedFiles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should not report anything when there are no binary-content or encoding-error files', () => {
    const skippedFiles: SkippedFileInfo[] = [
      { path: 'large.txt', reason: 'size-limit' },
      { path: 'binary.bin', reason: 'binary-extension' },
    ];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).not.toHaveBeenCalled();
  });

  test('should report single binary-content file', () => {
    const skippedFiles: SkippedFileInfo[] = [{ path: '/root/dir/malformed.txt', reason: 'binary-content' }];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('📄 Binary Files Detected:'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 file detected as binary'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/dir/malformed.txt'));
  });

  test('should report multiple binary-content files', () => {
    const skippedFiles: SkippedFileInfo[] = [
      { path: '/root/file1.txt', reason: 'binary-content' },
      { path: '/root/dir/file2.md', reason: 'binary-content' },
      { path: '/root/normal.bin', reason: 'binary-extension' }, // Should be ignored
    ];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('📄 Binary Files Detected:'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('2 files detected as binary'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/file1.txt'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/dir/file2.md'));
  });

  test('should show full paths correctly', () => {
    const skippedFiles: SkippedFileInfo[] = [{ path: '/root/src/components/app.tsx', reason: 'binary-content' }];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/src/components/app.tsx'));
  });

  test('should show warning messages about excluded files', () => {
    const skippedFiles: SkippedFileInfo[] = [{ path: '/root/file.txt', reason: 'binary-content' }];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('These files have been excluded'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Please review these files if you expected'));
  });

  test('should report single encoding-error file with suffix', () => {
    const skippedFiles: SkippedFileInfo[] = [{ path: '/root/bad-encoding.txt', reason: 'encoding-error' }];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('📄 Binary Files Detected:'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 file detected as binary'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/bad-encoding.txt'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('(encoding failed)'));
  });

  test('should report mixed binary-content and encoding-error files', () => {
    const skippedFiles: SkippedFileInfo[] = [
      { path: '/root/binary.txt', reason: 'binary-content' },
      { path: '/root/bad-encoding.html', reason: 'encoding-error' },
      { path: '/root/large.txt', reason: 'size-limit' }, // Should be ignored
    ];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('📄 Binary Files Detected:'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('2 files detected as binary'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/binary.txt'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/bad-encoding.html'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('(encoding failed)'));
  });

  test('should report only encoding-error files without suffix for binary-content', () => {
    const skippedFiles: SkippedFileInfo[] = [
      { path: '/root/binary1.txt', reason: 'binary-content' },
      { path: '/root/binary2.txt', reason: 'binary-content' },
    ];

    reportSkippedFiles('/root', skippedFiles);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/binary1.txt'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('/root/binary2.txt'));
    expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('(encoding failed)'));
  });
});
