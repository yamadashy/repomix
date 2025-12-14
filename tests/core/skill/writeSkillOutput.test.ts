import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { writeSkillOutput } from '../../../src/core/skill/writeSkillOutput.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

describe('writeSkillOutput', () => {
  test('should create skill directory structure and write files', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    const output = {
      skillMd: '---\nname: test-skill\n---\n# Test Skill',
      references: {
        summary: '# Summary\n\nPurpose and format description.',
        structure: '# Directory Structure\n\n```\nsrc/\n  index.ts\n```',
        files: '# Files\n\n## File: src/index.ts\n```typescript\nconsole.log("hello");\n```',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const result = await writeSkillOutput(output, skillDir, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    // Check references directory was created (includes skill directory with recursive: true)
    expect(mockMkdir).toHaveBeenCalledWith(path.join(skillDir, 'references'), {
      recursive: true,
    });

    // Check files were written
    expect(mockWriteFile).toHaveBeenCalledWith(path.join(skillDir, 'SKILL.md'), output.skillMd, 'utf-8');
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'summary.md'),
      output.references.summary,
      'utf-8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'project-structure.md'),
      output.references.structure,
      'utf-8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'files.md'),
      output.references.files,
      'utf-8',
    );

    // Check return value
    expect(result).toBe(skillDir);
  });

  test('should handle skill directories with various paths', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/home/user/.claude/skills/my-special-skill';

    await writeSkillOutput(output, skillDir, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    expect(mockMkdir).toHaveBeenCalledWith(path.join(skillDir, 'references'), {
      recursive: true,
    });
  });

  test('should write tech-stack.md when techStack is provided', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
        techStack: '# Tech Stack\n\n- TypeScript\n- Node.js',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    await writeSkillOutput(output, skillDir, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    // Check tech-stack.md was written
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'tech-stack.md'),
      output.references.techStack,
      'utf-8',
    );
  });

  test('should throw RepomixError with permission message on EPERM error', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const permError = new Error('Permission denied') as NodeJS.ErrnoException;
    permError.code = 'EPERM';
    const mockWriteFile = vi.fn().mockRejectedValue(permError);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const promise = writeSkillOutput(output, skillDir, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    await expect(promise).rejects.toThrow(RepomixError);
    await expect(promise).rejects.toThrow(/Permission denied/);
  });

  test('should throw RepomixError with permission message on EACCES error', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const accessError = new Error('Access denied') as NodeJS.ErrnoException;
    accessError.code = 'EACCES';
    const mockWriteFile = vi.fn().mockRejectedValue(accessError);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const promise = writeSkillOutput(output, skillDir, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    await expect(promise).rejects.toThrow(RepomixError);
    await expect(promise).rejects.toThrow(/Permission denied/);
  });

  test('should throw RepomixError with generic message on other errors', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const genericError = new Error('Disk full');
    const mockWriteFile = vi.fn().mockRejectedValue(genericError);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const promise = writeSkillOutput(output, skillDir, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    await expect(promise).rejects.toThrow(RepomixError);
    await expect(promise).rejects.toThrow(/Disk full/);
  });

  test('should handle non-Error objects in catch block', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockRejectedValue('string error');

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    await expect(
      writeSkillOutput(output, skillDir, {
        mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
        writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
      }),
    ).rejects.toThrow(RepomixError);
  });
});
