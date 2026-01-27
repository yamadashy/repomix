import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../shared/logger.js';

const LOCK_FILENAME = '.repomix.lock';
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export interface LockInfo {
  pid: number;
  startTime: number;
  cwd: string;
}

export class FileLockError extends Error {
  constructor(
    message: string,
    public readonly lockPath: string,
    public readonly existingLock?: LockInfo,
  ) {
    super(message);
    this.name = 'FileLockError';
  }
}

/**
 * Check if a process with given PID is still running.
 * Uses a platform-agnostic approach by trying to send signal 0.
 */
const isProcessRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Read and parse lock file contents.
 */
const readLockFile = async (lockPath: string): Promise<LockInfo | null> => {
  try {
    const content = await fs.readFile(lockPath, 'utf-8');
    const parsed = JSON.parse(content) as LockInfo;

    if (typeof parsed.pid !== 'number' || typeof parsed.startTime !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

/**
 * Check if a lock is stale (process dead or lock too old).
 */
const isLockStale = (lockInfo: LockInfo): boolean => {
  // Check if process is still running
  if (!isProcessRunning(lockInfo.pid)) {
    logger.debug(`Lock is stale: process ${lockInfo.pid} is not running`);
    return true;
  }

  // Check if lock is too old (fallback for zombie processes)
  const age = Date.now() - lockInfo.startTime;
  if (age > STALE_THRESHOLD_MS) {
    logger.debug(`Lock is stale: lock age ${age}ms exceeds threshold ${STALE_THRESHOLD_MS}ms`);
    return true;
  }

  return false;
};

/**
 * Acquire a file lock for the specified directory.
 *
 * @param targetDir The directory to lock (where .repomix.lock will be created)
 * @returns The path to the lock file (for cleanup)
 * @throws FileLockError if lock cannot be acquired
 */
export const acquireLock = async (targetDir: string): Promise<string> => {
  const lockPath = path.join(targetDir, LOCK_FILENAME);
  const lockInfo: LockInfo = {
    pid: process.pid,
    startTime: Date.now(),
    cwd: process.cwd(),
  };

  // Check for existing lock
  const existingLock = await readLockFile(lockPath);

  if (existingLock) {
    if (isLockStale(existingLock)) {
      // Remove stale lock
      logger.debug(`Removing stale lock file: ${lockPath}`);
      try {
        await fs.unlink(lockPath);
      } catch {
        // Ignore errors when removing stale lock
      }
    } else {
      // Lock is held by another active process
      throw new FileLockError(
        `Another repomix process (PID: ${existingLock.pid}) is already running in this directory. ` +
          `If you believe this is an error, remove the lock file: ${lockPath}`,
        lockPath,
        existingLock,
      );
    }
  }

  // Try to create lock file atomically
  try {
    const fileHandle = await fs.open(lockPath, 'wx');
    await fileHandle.writeFile(JSON.stringify(lockInfo, null, 2));
    await fileHandle.close();
    logger.debug(`Acquired lock: ${lockPath}`);
    return lockPath;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      // Race condition: another process created the lock between our check and create
      const raceLock = await readLockFile(lockPath);
      throw new FileLockError(
        `Another repomix process acquired the lock. If you believe this is an error, remove the lock file: ${lockPath}`,
        lockPath,
        raceLock ?? undefined,
      );
    }
    throw error;
  }
};

/**
 * Release a file lock.
 *
 * @param lockPath The path to the lock file to remove
 */
export const releaseLock = async (lockPath: string): Promise<void> => {
  try {
    // Verify we own the lock before releasing
    const lockInfo = await readLockFile(lockPath);
    if (lockInfo && lockInfo.pid === process.pid) {
      await fs.unlink(lockPath);
      logger.debug(`Released lock: ${lockPath}`);
    } else if (lockInfo) {
      logger.warn(`Lock file owned by different process (PID: ${lockInfo.pid}), not releasing`);
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // Lock file already removed, that's fine
      logger.debug(`Lock file already removed: ${lockPath}`);
      return;
    }
    logger.warn(`Failed to release lock: ${lockPath}`, error);
  }
};

/**
 * Execute a function while holding a lock on the target directory.
 *
 * @param targetDir The directory to lock
 * @param fn The function to execute while holding the lock
 * @returns The result of the function
 */
export const withLock = async <T>(targetDir: string, fn: () => Promise<T>): Promise<T> => {
  const lockPath = await acquireLock(targetDir);
  try {
    return await fn();
  } finally {
    await releaseLock(lockPath);
  }
};
