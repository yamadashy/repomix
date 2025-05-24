import { beforeEach, describe, expect, test, vi } from 'vitest';
import { isGitInstalled } from '../../../src/core/git/isGitInstalled.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('isGitInstalled', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should return true when git is installed', async () => {
    const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' });

    const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

    expect(result).toBe(true);
    expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
  });

  test('should return false and log error when git command fails', async () => {
    const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Command not found: git'));

    const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

    expect(result).toBe(false);
    expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
    expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', 'Command not found: git');
  });

  test('should return false and log error with custom error message', async () => {
    const customError = new Error('Custom git error message');
    const mockFileExecAsync = vi.fn().mockRejectedValue(customError);

    const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

    expect(result).toBe(false);
    expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
    expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', 'Custom git error message');
  });

  test('should return false when git command fails with empty error message', async () => {
    const customError = new Error('');
    const mockFileExecAsync = vi.fn().mockRejectedValue(customError);

    const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

    expect(result).toBe(false);
    expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
    expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', '');
  });

  test('should return false when git command returns stderr', async () => {
    const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: 'git: command not found' });

    const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

    expect(result).toBe(false);
    expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
  });
});
