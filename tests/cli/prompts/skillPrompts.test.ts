import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  getSkillBaseDir,
  getSkillLocation,
  prepareSkillDir,
  promptSkillLocation,
} from '../../../src/cli/prompts/skillPrompts.js';
import { OperationCancelledError, RepomixError } from '../../../src/shared/errorHandle.js';

// Helper to create mock deps with proper typing
const createMockDeps = (overrides: {
  selectValue: unknown;
  confirmValue?: unknown;
  isCancelFn: (value: unknown) => boolean;
  accessRejects: boolean;
}) => ({
  select: vi.fn().mockResolvedValue(overrides.selectValue),
  confirm: vi.fn().mockResolvedValue(overrides.confirmValue),
  isCancel: overrides.isCancelFn as (value: unknown) => value is symbol,
  access: overrides.accessRejects
    ? vi.fn().mockRejectedValue(new Error('ENOENT'))
    : vi.fn().mockResolvedValue(undefined),
});

describe('skillPrompts', () => {
  describe('getSkillBaseDir', () => {
    test('should return personal skills directory for personal location', () => {
      const result = getSkillBaseDir('/test/project', 'personal');
      expect(result).toBe(path.join(os.homedir(), '.claude', 'skills'));
    });

    test('should return project skills directory for project location', () => {
      const result = getSkillBaseDir('/test/project', 'project');
      expect(result).toBe(path.join('/test/project', '.claude', 'skills'));
    });
  });

  describe('promptSkillLocation', () => {
    test('should return personal location when selected', async () => {
      const mockDeps = createMockDeps({
        selectValue: 'personal',
        isCancelFn: () => false,
        accessRejects: true,
      });

      const result = await promptSkillLocation('test-skill', '/test/project', mockDeps);

      expect(result.location).toBe('personal');
      expect(result.skillDir).toBe(path.join(os.homedir(), '.claude', 'skills', 'test-skill'));
      expect(mockDeps.select).toHaveBeenCalledOnce();
      expect(mockDeps.confirm).not.toHaveBeenCalled();
    });

    test('should return project location when selected', async () => {
      const mockDeps = createMockDeps({
        selectValue: 'project',
        isCancelFn: () => false,
        accessRejects: true,
      });

      const result = await promptSkillLocation('test-skill', '/test/project', mockDeps);

      expect(result.location).toBe('project');
      expect(result.skillDir).toBe(path.join('/test/project', '.claude', 'skills', 'test-skill'));
    });

    test('should prompt for overwrite when directory exists', async () => {
      const mockDeps = createMockDeps({
        selectValue: 'personal',
        confirmValue: true,
        isCancelFn: () => false,
        accessRejects: false, // Directory exists
      });

      const result = await promptSkillLocation('test-skill', '/test/project', mockDeps);

      expect(mockDeps.confirm).toHaveBeenCalledOnce();
      expect(result.location).toBe('personal');
    });

    test('should throw OperationCancelledError when select is cancelled', async () => {
      const mockDeps = createMockDeps({
        selectValue: Symbol('cancel'),
        isCancelFn: () => true,
        accessRejects: true,
      });

      await expect(promptSkillLocation('test-skill', '/test/project', mockDeps)).rejects.toThrow(
        OperationCancelledError,
      );
    });

    test('should throw OperationCancelledError when overwrite is declined', async () => {
      const mockDeps = createMockDeps({
        selectValue: 'personal',
        confirmValue: false,
        isCancelFn: () => false,
        accessRejects: false, // Directory exists
      });

      await expect(promptSkillLocation('test-skill', '/test/project', mockDeps)).rejects.toThrow(
        OperationCancelledError,
      );
    });

    test('should throw OperationCancelledError when confirm is cancelled', async () => {
      let callCount = 0;
      const mockDeps = createMockDeps({
        selectValue: 'personal',
        confirmValue: Symbol('cancel'),
        isCancelFn: () => {
          callCount++;
          // First call for select returns false, second call for confirm returns true (cancelled)
          return callCount > 1;
        },
        accessRejects: false, // Directory exists
      });

      await expect(promptSkillLocation('test-skill', '/test/project', mockDeps)).rejects.toThrow(
        OperationCancelledError,
      );
    });
  });

  describe('prepareSkillDir', () => {
    test('should succeed when directory does not exist', async () => {
      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      const mockDeps = {
        access: vi.fn().mockRejectedValue(enoentError),
        rm: vi.fn(),
      };

      await expect(prepareSkillDir('/test/skill-dir', false, mockDeps)).resolves.toBeUndefined();
      expect(mockDeps.rm).not.toHaveBeenCalled();
    });

    test('should throw RepomixError when directory exists and force is false', async () => {
      const mockDeps = {
        access: vi.fn().mockResolvedValue(undefined),
        rm: vi.fn(),
      };

      await expect(prepareSkillDir('/test/skill-dir', false, mockDeps)).rejects.toThrow(RepomixError);
      await expect(prepareSkillDir('/test/skill-dir', false, mockDeps)).rejects.toThrow(
        'Skill directory already exists: /test/skill-dir. Use --force to overwrite.',
      );
      expect(mockDeps.rm).not.toHaveBeenCalled();
    });

    test('should remove directory when force is true and directory exists', async () => {
      const mockDeps = {
        access: vi.fn().mockResolvedValue(undefined),
        rm: vi.fn().mockResolvedValue(undefined),
      };

      await expect(prepareSkillDir('/test/skill-dir', true, mockDeps)).resolves.toBeUndefined();
      expect(mockDeps.rm).toHaveBeenCalledWith('/test/skill-dir', { recursive: true, force: true });
    });

    test('should re-throw non-ENOENT errors', async () => {
      const permissionError = new Error('EACCES') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';
      const mockDeps = {
        access: vi.fn().mockRejectedValue(permissionError),
        rm: vi.fn(),
      };

      await expect(prepareSkillDir('/test/skill-dir', false, mockDeps)).rejects.toThrow(permissionError);
      expect(mockDeps.rm).not.toHaveBeenCalled();
    });
  });

  describe('getSkillLocation', () => {
    test('should return personal for paths under ~/.claude/skills', () => {
      const personalPath = path.join(os.homedir(), '.claude', 'skills', 'my-skill');
      expect(getSkillLocation(personalPath)).toBe('personal');
    });

    test('should return project for paths not under ~/.claude/skills', () => {
      expect(getSkillLocation('/project/.claude/skills/my-skill')).toBe('project');
      expect(getSkillLocation('/some/other/path')).toBe('project');
    });
  });
});
