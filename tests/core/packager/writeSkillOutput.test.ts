import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { writeSkillOutput } from '../../../src/core/packager/writeSkillOutput.js';

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

    const skillName = 'test-skill';
    const cwd = '/test/project';

    const result = await writeSkillOutput(output, skillName, cwd, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    // Check references directory was created (includes skill directory with recursive: true)
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
      path.join(cwd, '.claude/skills', skillName, 'references', 'summary.md'),
      output.references.summary,
      'utf-8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(cwd, '.claude/skills', skillName, 'references', 'structure.md'),
      output.references.structure,
      'utf-8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(cwd, '.claude/skills', skillName, 'references', 'files.md'),
      output.references.files,
      'utf-8',
    );

    // Check return value
    expect(result).toBe(path.join(cwd, '.claude/skills', skillName));
  });

  test('should write git-diffs.md and git-logs.md when provided', async () => {
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);

    const output = {
      skillMd: '---\nname: test-skill\n---\n# Test Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
        gitDiffs: '# Git Diffs\n\n```diff\n+added line\n```',
        gitLogs: '# Git Logs\n\n## Commit: abc123\nFix bug',
      },
    };

    const skillName = 'test-skill';
    const cwd = '/test/project';

    await writeSkillOutput(output, skillName, cwd, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    // Check git files were written
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(cwd, '.claude/skills', skillName, 'references', 'git-diffs.md'),
      output.references.gitDiffs,
      'utf-8',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(cwd, '.claude/skills', skillName, 'references', 'git-logs.md'),
      output.references.gitLogs,
      'utf-8',
    );
  });

  test('should handle skill names with special characters', async () => {
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

    const skillName = 'my-special-skill';
    const cwd = '/test/project';

    await writeSkillOutput(output, skillName, cwd, {
      mkdir: mockMkdir as unknown as typeof import('node:fs/promises').mkdir,
      writeFile: mockWriteFile as unknown as typeof import('node:fs/promises').writeFile,
    });

    expect(mockMkdir).toHaveBeenCalledWith(path.join(cwd, '.claude/skills', 'my-special-skill', 'references'), {
      recursive: true,
    });
  });
});
