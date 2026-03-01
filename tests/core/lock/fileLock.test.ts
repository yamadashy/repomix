import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireLock, FileLockError, releaseLock, withLock } from '../../../src/core/lock/fileLock.js';

describe('fileLock', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-lock-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('acquireLock', () => {
    it('should create a lock file in the target directory', async () => {
      const lockPath = await acquireLock(testDir);

      expect(lockPath).toBe(path.join(testDir, '.repomix.lock'));

      const lockExists = await fs
        .access(lockPath)
        .then(() => true)
        .catch(() => false);
      expect(lockExists).toBe(true);

      // Clean up
      await releaseLock(lockPath);
    });

    it('should store PID and timestamp in lock file', async () => {
      const lockPath = await acquireLock(testDir);

      const content = await fs.readFile(lockPath, 'utf-8');
      const lockInfo = JSON.parse(content);

      expect(lockInfo.pid).toBe(process.pid);
      expect(typeof lockInfo.startTime).toBe('number');
      expect(lockInfo.startTime).toBeLessThanOrEqual(Date.now());

      await releaseLock(lockPath);
    });

    it('should throw FileLockError if lock already exists from same process', async () => {
      const lockPath = await acquireLock(testDir);

      await expect(acquireLock(testDir)).rejects.toThrow(FileLockError);

      await releaseLock(lockPath);
    });

    it('should remove stale lock from non-existent process', async () => {
      // Create a fake stale lock with a non-existent PID
      const lockPath = path.join(testDir, '.repomix.lock');
      const staleLockInfo = {
        pid: 999999999, // Very unlikely to exist
        startTime: Date.now(),
        cwd: '/some/path',
      };
      await fs.writeFile(lockPath, JSON.stringify(staleLockInfo));

      // Should succeed because the stale lock should be removed
      const newLockPath = await acquireLock(testDir);
      expect(newLockPath).toBe(lockPath);

      // Verify the lock now has our PID
      const content = await fs.readFile(lockPath, 'utf-8');
      const lockInfo = JSON.parse(content);
      expect(lockInfo.pid).toBe(process.pid);

      await releaseLock(newLockPath);
    });
  });

  describe('releaseLock', () => {
    it('should remove the lock file', async () => {
      const lockPath = await acquireLock(testDir);

      await releaseLock(lockPath);

      const lockExists = await fs
        .access(lockPath)
        .then(() => true)
        .catch(() => false);
      expect(lockExists).toBe(false);
    });

    it('should not throw if lock file does not exist', async () => {
      const fakeLockPath = path.join(testDir, '.repomix.lock');

      await expect(releaseLock(fakeLockPath)).resolves.not.toThrow();
    });

    it('should not remove lock owned by different process', async () => {
      // Create a lock with a different PID (simulating another process)
      const lockPath = path.join(testDir, '.repomix.lock');
      const otherLockInfo = {
        pid: process.pid + 1, // Different PID
        startTime: Date.now(),
        cwd: '/some/path',
      };
      await fs.writeFile(lockPath, JSON.stringify(otherLockInfo));

      // releaseLock should not remove it
      await releaseLock(lockPath);

      // Lock should still exist
      const lockExists = await fs
        .access(lockPath)
        .then(() => true)
        .catch(() => false);
      expect(lockExists).toBe(true);
    });
  });

  describe('withLock', () => {
    it('should execute function while holding lock', async () => {
      let lockExistedDuringExecution = false;

      await withLock(testDir, async () => {
        const lockPath = path.join(testDir, '.repomix.lock');
        lockExistedDuringExecution = await fs
          .access(lockPath)
          .then(() => true)
          .catch(() => false);
      });

      expect(lockExistedDuringExecution).toBe(true);

      // Lock should be released after
      const lockPath = path.join(testDir, '.repomix.lock');
      const lockExists = await fs
        .access(lockPath)
        .then(() => true)
        .catch(() => false);
      expect(lockExists).toBe(false);
    });

    it('should release lock even if function throws', async () => {
      await expect(
        withLock(testDir, async () => {
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');

      // Lock should still be released
      const lockPath = path.join(testDir, '.repomix.lock');
      const lockExists = await fs
        .access(lockPath)
        .then(() => true)
        .catch(() => false);
      expect(lockExists).toBe(false);
    });

    it('should return the result of the function', async () => {
      const result = await withLock(testDir, async () => {
        return 'test result';
      });

      expect(result).toBe('test result');
    });
  });

  describe('FileLockError', () => {
    it('should include lock path and existing lock info', async () => {
      const lockPath = await acquireLock(testDir);

      try {
        await acquireLock(testDir);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileLockError);
        const lockError = error as FileLockError;
        expect(lockError.lockPath).toBe(path.join(testDir, '.repomix.lock'));
        expect(lockError.existingLock).toBeDefined();
        expect(lockError.existingLock?.pid).toBe(process.pid);
      }

      await releaseLock(lockPath);
    });
  });
});
