import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pc from 'picocolors';
import { OperationCancelledError, RepomixError } from '../../shared/errorHandle.js';
import { getDisplayPath } from '../cliReport.js';

// Lazy-load @clack/prompts (~55ms import cost) since skill prompts are used in <5% of runs.
let _prompts: typeof import('@clack/prompts') | undefined;
const getPrompts = async () => {
  _prompts ??= await import('@clack/prompts');
  return _prompts;
};

export type SkillLocation = 'personal' | 'project';

export interface SkillPromptResult {
  location: SkillLocation;
  skillDir: string;
}

const onCancelOperation = (): never => {
  // _prompts is guaranteed to be loaded by the caller (promptSkillLocation) before this is called
  _prompts?.cancel('Skill generation cancelled.');
  throw new OperationCancelledError('Skill generation cancelled');
};

/**
 * Get the base directory for skills based on location type.
 */
export const getSkillBaseDir = (cwd: string, location: SkillLocation): string => {
  if (location === 'personal') {
    return path.join(os.homedir(), '.claude', 'skills');
  }
  return path.join(cwd, '.claude', 'skills');
};

/**
 * Prompt user for skill location and handle overwrite confirmation.
 */
export const promptSkillLocation = async (
  skillName: string,
  cwd: string,
  deps?: Partial<{
    select: typeof import('@clack/prompts').select;
    confirm: typeof import('@clack/prompts').confirm;
    isCancel: typeof import('@clack/prompts').isCancel;
    access: typeof fs.access;
    rm: typeof fs.rm;
  }>,
): Promise<SkillPromptResult> => {
  const prompts = await getPrompts();
  const { select, confirm, isCancel, access, rm } = {
    select: prompts.select,
    confirm: prompts.confirm,
    isCancel: prompts.isCancel,
    access: fs.access,
    rm: fs.rm,
    ...deps,
  };
  // Step 1: Ask for skill location
  const location = await select({
    message: 'Where would you like to save the skill?',
    options: [
      {
        value: 'personal' as SkillLocation,
        label: 'Personal Skills',
        hint: '~/.claude/skills/ - Available across all projects',
      },
      {
        value: 'project' as SkillLocation,
        label: 'Project Skills',
        hint: '.claude/skills/ - Shared with team via git',
      },
    ],
    initialValue: 'personal' as SkillLocation,
  });

  if (isCancel(location)) {
    onCancelOperation();
  }

  const skillDir = path.join(getSkillBaseDir(cwd, location as SkillLocation), skillName);

  // Step 2: Check if directory exists and ask for overwrite
  let dirExists = false;
  try {
    await access(skillDir);
    dirExists = true;
  } catch {
    // Directory doesn't exist
  }

  if (dirExists) {
    const displayPath = getDisplayPath(skillDir, cwd);
    const overwrite = await confirm({
      message: `Skill directory already exists. Do you want to overwrite it?\n${pc.dim(`path: ${displayPath}`)}`,
    });

    if (isCancel(overwrite) || !overwrite) {
      onCancelOperation();
    }

    // Remove existing directory before regeneration
    await rm(skillDir, { recursive: true, force: true });
  }

  return {
    location: location as SkillLocation,
    skillDir,
  };
};

/**
 * Prepare skill directory for non-interactive mode.
 * Handles force overwrite by removing existing directory.
 */
export const prepareSkillDir = async (
  skillDir: string,
  force: boolean,
  deps = {
    access: fs.access,
    rm: fs.rm,
    stat: fs.stat,
  },
): Promise<void> => {
  try {
    await deps.access(skillDir);
    // Path exists - check if it's a directory
    const stats = await deps.stat(skillDir);
    if (!stats.isDirectory()) {
      throw new RepomixError(`Skill output path exists but is not a directory: ${skillDir}`);
    }
    // Directory exists
    if (force) {
      await deps.rm(skillDir, { recursive: true, force: true });
    } else {
      throw new RepomixError(`Skill directory already exists: ${skillDir}. Use --force to overwrite.`);
    }
  } catch (error) {
    // Re-throw if it's not a "file not found" error
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      throw error;
    }
    // Directory doesn't exist - good to go
  }
};

/**
 * Resolve skill output path and prepare directory for non-interactive mode.
 * Returns the resolved skill directory path.
 */
export const resolveAndPrepareSkillDir = async (skillOutput: string, cwd: string, force: boolean): Promise<string> => {
  const skillDir = path.isAbsolute(skillOutput) ? skillOutput : path.resolve(cwd, skillOutput);
  await prepareSkillDir(skillDir, force);
  return skillDir;
};

/**
 * Determine skill location type based on the skill directory path.
 */
export const getSkillLocation = (skillDir: string): SkillLocation => {
  const personalSkillsBase = getSkillBaseDir('', 'personal');
  return skillDir.startsWith(personalSkillsBase) ? 'personal' : 'project';
};
