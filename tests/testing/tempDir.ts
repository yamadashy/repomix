import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { onTestFinished } from 'vitest';

interface CreateTempDirOptions {
  // Resolve symlinks in the returned path (macOS reports os.tmpdir() under /var,
  // which is a symlink to /private/var). Use it when the code under test compares
  // the path against its own realpath.
  realpath?: boolean;
}

/**
 * Create a fresh directory under os.tmpdir() and remove it when the current test
 * finishes. Call it from inside a test or a beforeEach hook (it relies on
 * onTestFinished); for directories shared across a whole file, manage the
 * lifecycle by hand in beforeAll/afterAll.
 */
export const createTempDir = async (prefix: string, options: CreateTempDirOptions = {}): Promise<string> => {
  const created = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  // Register cleanup before any further awaits so the directory is removed even
  // if a later step fails.
  onTestFinished(() => removeTempDir(created));
  return options.realpath ? fs.realpath(created) : created;
};

// maxRetries rides out transient EBUSY/EPERM on Windows when a just-closed handle
// still holds a lock on a file inside the directory.
const removeTempDir = (dir: string): Promise<void> => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 });
