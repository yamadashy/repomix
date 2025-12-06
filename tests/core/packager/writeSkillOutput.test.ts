import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { writeSkillOutput } from '../../../src/core/packager/writeSkillOutput.js';

describe('writeSkillOutput', () => {
  test('should create skill directory structure and write files', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    const output = {
      skillMd: '---\nname: test-skill\n---\n# Test Skill',
      codebaseMd: '# Codebase\n\nFile contents here',
    };

    const skillName = 'test-skill';
    const cwd = '/test/project';

    const result = await writeSkillOutput(output, skillName, cwd, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    // Check directories were created
    expect(mockMkdir).toHaveBeenCalledWith(path.join(cwd, '.claude/skills', skillName), { recursive: true });
    expect(mockMkdir).toHaveBeenCalledWith(path.join(cwd, '.claude/skills', skillName, 'references'), {
      recursive: true,
    });

    // Check files were written
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(cwd, '.claude/skills', skillName, 'SKILL.md'),
      output.skillMd,
      'utf-8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(cwd, '.claude/skills', skillName, 'references', 'codebase.md'),
      output.codebaseMd,
      'utf-8',
    );

    // Check return value
    expect(result).toBe(path.join(cwd, '.claude/skills', skillName));
  });

  test('should handle skill names with special characters', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    const output = {
      skillMd: '# Skill',
      codebaseMd: '# Codebase',
    };

    const skillName = 'my-special-skill';
    const cwd = '/test/project';

    await writeSkillOutput(output, skillName, cwd, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    expect(mockMkdir).toHaveBeenCalledWith(path.join(cwd, '.claude/skills', 'my-special-skill'), { recursive: true });
  });
});
