import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { getSkillBaseDir, promptSkillLocation } from '../../../src/cli/prompts/skillPrompts.js';

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

    test('should exit when select is cancelled', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const mockDeps = createMockDeps({
        selectValue: Symbol('cancel'),
        isCancelFn: () => true,
        accessRejects: true,
      });

      await expect(promptSkillLocation('test-skill', '/test/project', mockDeps)).rejects.toThrow('process.exit called');

      mockExit.mockRestore();
    });

    test('should exit when overwrite is declined', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const mockDeps = createMockDeps({
        selectValue: 'personal',
        confirmValue: false,
        isCancelFn: () => false,
        accessRejects: false, // Directory exists
      });

      await expect(promptSkillLocation('test-skill', '/test/project', mockDeps)).rejects.toThrow('process.exit called');

      mockExit.mockRestore();
    });

    test('should exit when confirm is cancelled', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

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

      await expect(promptSkillLocation('test-skill', '/test/project', mockDeps)).rejects.toThrow('process.exit called');

      mockExit.mockRestore();
    });
  });
});
