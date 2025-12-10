import { describe, expect, test } from 'vitest';
import {
  generateProjectName,
  generateSkillDescription,
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
      // This depends on the actual directory name, so we just check it returns something
      const result = generateProjectName(['.']);
      expect(result).toBeTruthy();
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
});
