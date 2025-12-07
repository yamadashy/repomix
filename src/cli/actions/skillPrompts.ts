import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as prompts from '@clack/prompts';
import pc from 'picocolors';

export type SkillLocation = 'personal' | 'project';

export interface SkillPromptResult {
  location: SkillLocation;
  skillDir: string;
}

const onCancelOperation = () => {
  prompts.cancel('Skill generation cancelled.');
  process.exit(0);
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
  deps = {
    select: prompts.select,
    confirm: prompts.confirm,
    isCancel: prompts.isCancel,
    access: fs.access,
  },
): Promise<SkillPromptResult> => {
  // Step 1: Ask for skill location
  const location = await deps.select({
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

  if (deps.isCancel(location)) {
    onCancelOperation();
  }

  const skillDir = path.join(getSkillBaseDir(cwd, location as SkillLocation), skillName);

  // Step 2: Check if directory exists and ask for overwrite
  let dirExists = false;
  try {
    await deps.access(skillDir);
    dirExists = true;
  } catch {
    // Directory doesn't exist
  }

  if (dirExists) {
    const overwrite = await deps.confirm({
      message: `Skill directory already exists: ${pc.yellow(skillDir)}\nDo you want to overwrite it?`,
    });

    if (deps.isCancel(overwrite) || !overwrite) {
      onCancelOperation();
    }
  }

  return {
    location: location as SkillLocation,
    skillDir,
  };
};
