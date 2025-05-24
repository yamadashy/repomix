import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pc from 'picocolors';
import { execGitShallowClone } from '../../core/git/execGitShallowClone.js';
import { getRemoteRefs } from '../../core/git/getRemoteRefs.js';
import { parseRemoteValue } from '../../core/git/gitRemoteParse.js';
import { isGitInstalled } from '../../core/git/isGitInstalled.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { Spinner } from '../cliSpinner.js';
import type { CliOptions } from '../types.js';
import { type DefaultActionRunnerResult, runDefaultAction } from './defaultAction.js';

export const runRemoteAction = async (
  repoUrl: string,
  cliOptions: CliOptions,
  deps = {
    isGitInstalled,
    execGitShallowClone,
    getRemoteRefs,
    runDefaultAction,
  },
): Promise<DefaultActionRunnerResult> => {
  if (!(await deps.isGitInstalled())) {
    throw new RepomixError('Git is not installed or not in the system PATH.');
  }

  // Get remote refs
  let refs: string[] = [];
  try {
    refs = await deps.getRemoteRefs(parseRemoteValue(repoUrl).repoUrl);
    logger.trace(`Retrieved ${refs.length} refs from remote repository`);
  } catch (error) {
    logger.trace('Failed to get remote refs, proceeding without them:', (error as Error).message);
  }

  // Parse the remote URL with the refs information
  const parsedFields = parseRemoteValue(repoUrl, refs);

  const spinner = new Spinner('Cloning repository...', cliOptions);
  const tempDirPath = await createTempDirectory();
  let result: DefaultActionRunnerResult;

  try {
    spinner.start();

    // Clone the repository
    await cloneRepository(parsedFields.repoUrl, tempDirPath, cliOptions.remoteBranch || parsedFields.remoteBranch, {
      execGitShallowClone: deps.execGitShallowClone,
    });

    spinner.succeed('Repository cloned successfully!');
    logger.log('');

    // Run the default action on the cloned repository
    result = await deps.runDefaultAction([tempDirPath], tempDirPath, cliOptions);
    await copyOutputToCurrentDirectory(tempDirPath, process.cwd(), result.config.output.filePath);
  } catch (error) {
    spinner.fail('Error during repository cloning. cleanup...');
    throw error;
  } finally {
    // Cleanup the temporary directory
    await cleanupTempDirectory(tempDirPath);
  }

  return result;
};

export const createTempDirectory = async (): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-'));
  logger.trace(`Created temporary directory. (path: ${pc.dim(tempDir)})`);
  return tempDir;
};

export const cloneRepository = async (
  url: string,
  directory: string,
  remoteBranch?: string,
  deps = {
    execGitShallowClone,
  },
): Promise<void> => {
  logger.log(`Clone repository: ${url} to temporary directory. ${pc.dim(`path: ${directory}`)}`);
  logger.log('');

  try {
    await deps.execGitShallowClone(url, directory, remoteBranch);
  } catch (error) {
    throw new RepomixError(`Failed to clone repository: ${(error as Error).message}`);
  }
};

export const cleanupTempDirectory = async (directory: string): Promise<void> => {
  logger.trace(`Cleaning up temporary directory: ${directory}`);
  await fs.rm(directory, { recursive: true, force: true });
};

export const copyOutputToCurrentDirectory = async (
  sourceDir: string,
  targetDir: string,
  outputFileName: string,
): Promise<void> => {
  const sourcePath = path.resolve(sourceDir, outputFileName);
  const targetPath = path.resolve(targetDir, outputFileName);

  try {
    logger.trace(`Copying output file from: ${sourcePath} to: ${targetPath}`);

    // Create target directory if it doesn't exist
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    throw new RepomixError(`Failed to copy output file: ${(error as Error).message}`);
  }
};
