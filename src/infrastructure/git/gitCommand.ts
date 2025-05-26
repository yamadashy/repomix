/**
 * Git command execution utilities
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';

const execPromise = promisify(exec);

/**
 * Execute git diff command
 */
export const execGitDiff = async (
  rootDir: string,
  staged: boolean = false,
): Promise<string> => {
  try {
    const command = staged ? 'git diff --staged' : 'git diff';
    const { stdout } = await execPromise(command, { cwd: rootDir });
    return stdout;
  } catch (error) {
    throw new RepomixError(`Failed to execute git diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
