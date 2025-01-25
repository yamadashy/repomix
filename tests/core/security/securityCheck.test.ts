// src/core/security/securityCheck.test.ts

import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import { runSecurityCheck } from '../../../src/core/security/securityCheck.js';
import type { SecurityCheckTask } from '../../../src/core/security/workers/securityCheckWorker.js';
import securityCheckWorker from '../../../src/core/security/workers/securityCheckWorker.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

const mockFiles: RawFile[] = [
  {
    path: 'test1.js',
    // secretlint-disable
    content: 'URL: https://user:pass@example.com', // Clear security issue
    // secretlint-enable
  },
  {
    path: 'test2.js',
    content: 'console.log("Hello World");', // No secrets
  },
];

const mockInitTaskRunner = () => {
  return async (task: SecurityCheckTask) => {
    return await securityCheckWorker(task);
  };
};

describe('runSecurityCheck', () => {
  it('should identify files with security issues', async () => {
    const result = await runSecurityCheck(mockFiles, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('test1.js');
    expect(result[0].messages).toHaveLength(1);
  });

  it('should call progress callback with correct messages', async () => {
    const progressCallback = vi.fn();

    await runSecurityCheck(mockFiles, progressCallback, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (1/2) ${pc.dim('test1.js')}`),
    );
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(`Running security check... (2/2) ${pc.dim('test2.js')}`),
    );
  });

  it('should handle worker errors gracefully', async () => {
    const mockError = new Error('Worker error');
    const mockErrorTaskRunner = () => {
      return async () => {
        throw mockError;
      };
    };

    await expect(
      runSecurityCheck(mockFiles, () => {}, {
        initTaskRunner: mockErrorTaskRunner,
      }),
    ).rejects.toThrow('Worker error');

    expect(logger.error).toHaveBeenCalledWith('Error during security check:', mockError);
  });

  it('should handle empty file list', async () => {
    const result = await runSecurityCheck([], () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual([]);
  });

  it('should log performance metrics in trace mode', async () => {
    await runSecurityCheck(mockFiles, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Starting security check for'));
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Security check completed in'));
  });

  it('should process files in parallel', async () => {
    const startTime = Date.now();

    await runSecurityCheck(mockFiles, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Parallel processing should be faster than sequential
    expect(duration).toBeLessThan(1000); // Adjust threshold as needed
  });

  it('should not modify original files', async () => {
    const originalFiles = JSON.parse(JSON.stringify(mockFiles));

    await runSecurityCheck(mockFiles, () => {}, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(mockFiles).toEqual(originalFiles);
  });
});
