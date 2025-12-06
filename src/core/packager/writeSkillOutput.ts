import fs from 'node:fs/promises';
import path from 'node:path';
import type { SkillOutputResult } from '../output/outputGenerate.js';

const SKILL_DIR_NAME = '.claude/skills';

/**
 * Writes skill output to the filesystem.
 * Creates the directory structure:
 *   .claude/skills/<skillName>/
 *   ├── SKILL.md
 *   └── references/
 *       └── codebase.md
 */
export const writeSkillOutput = async (
  output: SkillOutputResult,
  skillName: string,
  cwd: string,
  deps = {
    mkdir: fs.mkdir,
    writeFile: fs.writeFile,
  },
): Promise<string> => {
  const skillDir = path.join(cwd, SKILL_DIR_NAME, skillName);
  const referencesDir = path.join(skillDir, 'references');

  // Create directories
  await deps.mkdir(skillDir, { recursive: true });
  await deps.mkdir(referencesDir, { recursive: true });

  // Write SKILL.md
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  await deps.writeFile(skillMdPath, output.skillMd, 'utf-8');

  // Write references/codebase.md
  const codebaseMdPath = path.join(referencesDir, 'codebase.md');
  await deps.writeFile(codebaseMdPath, output.codebaseMd, 'utf-8');

  return skillDir;
};
