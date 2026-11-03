import type fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { writeSkillOutput } from '../../../src/core/skill/writeSkillOutput.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { type MockedDeps, mockOverloaded } from '../../testing/depsDoubles.js';

type Deps = NonNullable<Parameters<typeof writeSkillOutput>[2]>;

const createDeps = (): MockedDeps<Deps> => {
  const deps: MockedDeps<Deps> = {
    mkdir: mockOverloaded<typeof fs.mkdir>(),
    writeFile: vi.fn<typeof fs.writeFile>(),
  };
  deps.mkdir.mockResolvedValue(undefined);
  deps.writeFile.mockResolvedValue(undefined);
  return deps;
};

describe('writeSkillOutput', () => {
  test('should create skill directory structure and write files', async () => {
    const deps = createDeps();

    const output = {
      skillMd: '---\nname: test-skill\n---\n# Test Skill',
      references: {
        summary: '# Summary\n\nPurpose and format description.',
        structure: '# Directory Structure\n\n```\nsrc/\n  index.ts\n```',
        files: '# Files\n\n## File: src/index.ts\n```typescript\nconsole.log("hello");\n```',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const result = await writeSkillOutput(output, skillDir, deps);

    // Check references directory was created (includes skill directory with recursive: true)
    expect(deps.mkdir).toHaveBeenCalledWith(path.join(skillDir, 'references'), {
      recursive: true,
    });

    // Check files were written
    expect(deps.writeFile).toHaveBeenCalledWith(path.join(skillDir, 'SKILL.md'), output.skillMd, 'utf-8');
    expect(deps.writeFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'summary.md'),
      output.references.summary,
      'utf-8',
    );
    expect(deps.writeFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'project-structure.md'),
      output.references.structure,
      'utf-8',
    );
    expect(deps.writeFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'files.md'),
      output.references.files,
      'utf-8',
    );

    // Check return value
    expect(result).toBe(skillDir);
  });

  test('should handle skill directories with various paths', async () => {
    const deps = createDeps();

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/home/user/.claude/skills/my-special-skill';

    await writeSkillOutput(output, skillDir, deps);

    expect(deps.mkdir).toHaveBeenCalledWith(path.join(skillDir, 'references'), {
      recursive: true,
    });
  });

  test('should write tech-stacks.md when techStack is provided', async () => {
    const deps = createDeps();

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

    await writeSkillOutput(output, skillDir, deps);

    // Check tech-stacks.md was written
    expect(deps.writeFile).toHaveBeenCalledWith(
      path.join(skillDir, 'references', 'tech-stacks.md'),
      output.references.techStack,
      'utf-8',
    );
  });

  test('should throw RepomixError with permission message on EPERM error', async () => {
    const deps = createDeps();
    const permError = new Error('Permission denied') as NodeJS.ErrnoException;
    permError.code = 'EPERM';
    deps.writeFile.mockRejectedValue(permError);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const promise = writeSkillOutput(output, skillDir, deps);

    await expect(promise).rejects.toThrow(RepomixError);
    await expect(promise).rejects.toThrow(/Permission denied/);
  });

  test('should throw RepomixError with permission message on EACCES error', async () => {
    const deps = createDeps();
    const accessError = new Error('Access denied') as NodeJS.ErrnoException;
    accessError.code = 'EACCES';
    deps.writeFile.mockRejectedValue(accessError);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const promise = writeSkillOutput(output, skillDir, deps);

    await expect(promise).rejects.toThrow(RepomixError);
    await expect(promise).rejects.toThrow(/Permission denied/);
  });

  test('should throw RepomixError with generic message on other errors', async () => {
    const deps = createDeps();
    const genericError = new Error('Disk full');
    deps.writeFile.mockRejectedValue(genericError);

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    const promise = writeSkillOutput(output, skillDir, deps);

    await expect(promise).rejects.toThrow(RepomixError);
    await expect(promise).rejects.toThrow(/Disk full/);
  });

  test('should handle non-Error objects in catch block', async () => {
    const deps = createDeps();
    deps.writeFile.mockRejectedValue('string error');

    const output = {
      skillMd: '# Skill',
      references: {
        summary: '# Summary',
        structure: '# Structure',
        files: '# Files',
      },
    };

    const skillDir = '/test/project/.claude/skills/test-skill';

    await expect(writeSkillOutput(output, skillDir, deps)).rejects.toThrow(RepomixError);
  });
});
