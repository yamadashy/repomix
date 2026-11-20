import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  extractRepoName,
  generateProjectName,
  generateProjectNameFromUrl,
  generateSkillDescription,
  getSkillBaseDir,
  getSkillLocation,
  toKebabCase,
  validateSkillName,
} from '../../../src/core/skill/skillUtils.js';

describe('skillUtils', () => {
  describe('toKebabCase', () => {
    test('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('MyProjectName')).toBe('my-project-name');
    });

    test('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('myProjectName')).toBe('my-project-name');
    });

    test('should convert snake_case to kebab-case', () => {
      expect(toKebabCase('my_project_name')).toBe('my-project-name');
    });

    test('should convert spaces to hyphens', () => {
      expect(toKebabCase('my project name')).toBe('my-project-name');
    });

    test('should remove invalid characters', () => {
      expect(toKebabCase('my@project#name!')).toBe('myprojectname');
    });

    test('should collapse multiple hyphens', () => {
      expect(toKebabCase('my--project--name')).toBe('my-project-name');
    });

    test('should trim leading and trailing hyphens', () => {
      expect(toKebabCase('-my-project-name-')).toBe('my-project-name');
    });

    test('should handle already kebab-case strings', () => {
      expect(toKebabCase('my-project-name')).toBe('my-project-name');
    });

    test('should handle empty string', () => {
      expect(toKebabCase('')).toBe('');
    });

    test('should handle mixed case with numbers', () => {
      // Numbers don't trigger hyphen insertion (only lowercase-to-uppercase transitions do)
      expect(toKebabCase('MyProject123Name')).toBe('my-project123name');
    });
  });

  describe('validateSkillName', () => {
    test('should return kebab-case name', () => {
      expect(validateSkillName('MyProject')).toBe('my-project');
    });

    test('should truncate to 64 characters', () => {
      const longName = 'a'.repeat(100);
      expect(validateSkillName(longName).length).toBe(64);
    });

    test('should throw error for empty name after normalization', () => {
      expect(() => validateSkillName('!@#$%')).toThrow('Skill name cannot be empty after normalization');
    });

    test('should handle valid kebab-case names', () => {
      expect(validateSkillName('my-valid-skill-name')).toBe('my-valid-skill-name');
    });

    // Security tests for path traversal prevention
    test('should reject path traversal attempts with forward slashes', () => {
      expect(() => validateSkillName('../../../etc/passwd')).toThrow('Skill name cannot contain path separators');
      expect(() => validateSkillName('foo/bar')).toThrow('Skill name cannot contain path separators');
    });

    test('should reject path traversal attempts with backslashes', () => {
      expect(() => validateSkillName('..\\..\\etc\\passwd')).toThrow('Skill name cannot contain path separators');
      expect(() => validateSkillName('foo\\bar')).toThrow('Skill name cannot contain path separators');
    });

    test('should reject null bytes', () => {
      expect(() => validateSkillName('foo\0bar')).toThrow('Skill name cannot contain path separators or null bytes');
    });

    test('should reject dot-only names', () => {
      expect(() => validateSkillName('.')).toThrow('Skill name cannot consist only of dots');
      expect(() => validateSkillName('..')).toThrow('Skill name cannot consist only of dots');
      expect(() => validateSkillName('...')).toThrow('Skill name cannot consist only of dots');
    });
  });

  describe('generateProjectNameFromUrl', () => {
    test('should extract and convert GitHub URL to title case', () => {
      expect(generateProjectNameFromUrl('https://github.com/vitejs/vite')).toBe('Vite');
    });

    test('should handle kebab-case repo names', () => {
      expect(generateProjectNameFromUrl('https://github.com/yamadashy/repomix')).toBe('Repomix');
    });

    test('should handle snake_case repo names', () => {
      expect(generateProjectNameFromUrl('https://github.com/user/my_project_name')).toBe('My Project Name');
    });

    test('should handle shorthand format', () => {
      expect(generateProjectNameFromUrl('yamadashy/repomix')).toBe('Repomix');
    });

    test('should handle .git suffix', () => {
      expect(generateProjectNameFromUrl('https://github.com/vitejs/vite.git')).toBe('Vite');
    });

    test('should handle trailing slash', () => {
      expect(generateProjectNameFromUrl('https://github.com/vitejs/vite/')).toBe('Vite');
    });

    test('should handle multiple trailing slashes', () => {
      expect(generateProjectNameFromUrl('https://github.com/vitejs/vite///')).toBe('Vite');
    });

    test('should handle query string', () => {
      expect(generateProjectNameFromUrl('https://github.com/vitejs/vite?tab=readme')).toBe('Vite');
    });

    test('should handle fragment', () => {
      expect(generateProjectNameFromUrl('https://github.com/vitejs/vite#installation')).toBe('Vite');
    });

    test('should handle trailing slash with .git suffix', () => {
      expect(generateProjectNameFromUrl('https://github.com/vitejs/vite.git/')).toBe('Vite');
    });
  });

  describe('extractRepoName', () => {
    test('should extract the repository name from a GitHub branch URL', () => {
      expect(extractRepoName('https://github.com/yamadashy/repomix/tree/main')).toBe('repomix');
    });

    test('should extract the repository name from a GitHub commit URL', () => {
      expect(extractRepoName('https://github.com/yamadashy/repomix/commit/abc123')).toBe('repomix');
    });

    test.each([
      ['yamadashy/repomix', 'repomix'],
      ['git@github.com:yamadashy/repomix.git', 'repomix'],
      ['https://github.com/yamadashy/repomix.git/', 'repomix'],
      ['https://github.com/yamadashy/repomix?tab=readme#usage', 'repomix'],
      ['https://gitlab.com/group/subgroup/project.git', 'project'],
      ['  https://www.github.com/yamadashy/repomix  ', 'repomix'],
    ])('should extract the repository name from %j', (url, expected) => {
      expect(extractRepoName(url)).toBe(expected);
    });

    test.each(['', 'repomix', 'git@example.com:repo.git'])('should fall back to "unknown" for %j', (url) => {
      expect(extractRepoName(url)).toBe('unknown');
    });
  });

  describe('generateProjectName', () => {
    test('should convert directory name to title case', () => {
      expect(generateProjectName(['my-project'])).toBe('My Project');
    });

    test('should handle snake_case directory names', () => {
      expect(generateProjectName(['my_project_name'])).toBe('My Project Name');
    });

    test('should use first directory when multiple provided', () => {
      expect(generateProjectName(['first-project', 'second-project'])).toBe('First Project');
    });

    test('should handle current directory', () => {
      // '.' resolves against the working directory, so it must match the absolute cwd's basename
      const result = generateProjectName(['.']);
      expect(result).toBe(generateProjectName([process.cwd()]));
      expect(result).not.toBe('');
    });
  });

  describe('generateSkillDescription', () => {
    test('should generate description with skill and project names', () => {
      const description = generateSkillDescription('my-skill', 'My Project');
      expect(description).toContain('My Project');
      expect(description).toContain('Reference codebase');
    });

    test('should truncate to 1024 characters', () => {
      const longProjectName = 'A'.repeat(1000);
      const description = generateSkillDescription('my-skill', longProjectName);
      expect(description.length).toBeLessThanOrEqual(1024);
    });

    test('should include usage guidance', () => {
      const description = generateSkillDescription('my-skill', 'My Project');
      expect(description).toContain('Use this skill when');
    });
  });

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

  describe('getSkillLocation', () => {
    test('should return personal for paths under ~/.claude/skills', () => {
      const personalPath = path.join(os.homedir(), '.claude', 'skills', 'my-skill');
      expect(getSkillLocation(personalPath)).toBe('personal');
    });

    test('should return project for paths not under ~/.claude/skills', () => {
      expect(getSkillLocation('/project/.claude/skills/my-skill')).toBe('project');
      expect(getSkillLocation('/some/other/path')).toBe('project');
    });

    test('should not treat a sibling directory with the same prefix as personal skills', () => {
      const personalSkillsBase = getSkillBaseDir('', 'personal');
      const siblingPath = path.join(
        path.dirname(personalSkillsBase),
        `${path.basename(personalSkillsBase)}-backup`,
        'skill',
      );

      expect(getSkillLocation(siblingPath)).toBe('project');
    });
  });
});
