import fs from 'node:fs/promises';
import path from 'node:path';
import { RepomixError } from '../../shared/errorHandle.js';
import type { SkillOutputResult } from './packSkill.js';

/**
 * Writes skill output to the filesystem.
 * Creates the directory structure:
 *   <skillDir>/
 *   ├── SKILL.md
 *   └── references/
 *       ├── summary.md
 *       ├── project-structure.md
 *       ├── files.md
 *       └── tech-stack.md (if available)
 */
export const writeSkillOutput = async (
  output: SkillOutputResult,
  skillDir: string,
  deps = {
    mkdir: fs.mkdir,
    writeFile: fs.writeFile,
  },
): Promise<string> => {
  const referencesDir = path.join(skillDir, 'references');

  try {
    // Create directories
    await deps.mkdir(referencesDir, { recursive: true });

    // Write SKILL.md
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    await deps.writeFile(skillMdPath, output.skillMd, 'utf-8');

    // Write reference files
    await deps.writeFile(path.join(referencesDir, 'summary.md'), output.references.summary, 'utf-8');
    await deps.writeFile(path.join(referencesDir, 'project-structure.md'), output.references.structure, 'utf-8');
    await deps.writeFile(path.join(referencesDir, 'files.md'), output.references.files, 'utf-8');

    // Write tech-stack.md if available
    if (output.references.techStack) {
      await deps.writeFile(path.join(referencesDir, 'tech-stack.md'), output.references.techStack, 'utf-8');
    }

    return skillDir;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'EPERM' || nodeError.code === 'EACCES') {
      throw new RepomixError(
        `Failed to write skill output to ${skillDir}: Permission denied. Please check directory permissions.`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
    throw new RepomixError(`Failed to write skill output: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error instanceof Error ? error : undefined,
    });
  }
};
