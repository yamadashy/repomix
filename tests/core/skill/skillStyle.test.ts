import { describe, expect, test } from 'vitest';
import { generateSkillMd, getSkillTemplate } from '../../../src/core/skill/skillStyle.js';

describe('skillStyle', () => {
  describe('getSkillTemplate', () => {
    test('should return valid SKILL.md template', () => {
      const template = getSkillTemplate();
      expect(template).toContain('---');
      expect(template).toContain('name:');
      expect(template).toContain('description:');
      expect(template).toContain('# ');
      expect(template).toContain('references/');
    });

    test('should include files table with contents column', () => {
      const template = getSkillTemplate();
      expect(template).toContain('## Files');
      expect(template).toContain('| File | Contents |');
    });

    test('should include how to use section with numbered steps', () => {
      const template = getSkillTemplate();
      expect(template).toContain('## How to Use');
      expect(template).toContain('### 1. Find file locations');
      expect(template).toContain('### 2. Read file contents');
      expect(template).toContain('### 3. Search for code');
    });

    test('should include overview and common use cases', () => {
      const template = getSkillTemplate();
      expect(template).toContain('## Overview');
      expect(template).toContain('## Common Use Cases');
      expect(template).toContain('## Tips');
    });

    test('should reference multiple files', () => {
      const template = getSkillTemplate();
      expect(template).toContain('references/summary.md');
      expect(template).toContain('references/project-structure.md');
      expect(template).toContain('references/files.md');
    });
  });

  describe('generateSkillMd', () => {
    const createTestContext = (overrides = {}) => ({
      skillName: 'test-skill',
      skillDescription: 'Test description',
      projectName: 'Test Project',
      totalFiles: 1,
      totalLines: 100,
      totalTokens: 100,
      hasTechStack: false,
      ...overrides,
    });

    test('should generate SKILL.md with all fields', () => {
      const context = createTestContext({
        skillName: 'my-project-skill',
        skillDescription: 'Reference codebase for My Project.',
        projectName: 'My Project',
        totalFiles: 42,
        totalLines: 1000,
        totalTokens: 12345,
      });

      const result = generateSkillMd(context);

      // Check YAML frontmatter
      expect(result).toContain('---');
      expect(result).toContain('name: my-project-skill');
      expect(result).toContain('description: Reference codebase for My Project.');

      // Check content
      expect(result).toContain('# My Project Codebase Reference');
      expect(result).toContain('42 files');
      expect(result).toContain('12345 tokens');
    });

    test('should end with newline', () => {
      const result = generateSkillMd(createTestContext());
      expect(result.endsWith('\n')).toBe(true);
    });

    test('should include references to multiple files', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).toContain('`references/summary.md`');
      expect(result).toContain('`references/project-structure.md`');
      expect(result).toContain('`references/files.md`');
    });

    test('should not include git sections (skill output is for reference codebases)', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).not.toContain('git-diffs.md');
      expect(result).not.toContain('git-logs.md');
    });

    test('should include tech-stack reference when hasTechStack is true', () => {
      const result = generateSkillMd(createTestContext({ hasTechStack: true }));
      expect(result).toContain('`references/tech-stack.md`');
    });

    test('should not include tech-stack reference when hasTechStack is false', () => {
      const result = generateSkillMd(createTestContext({ hasTechStack: false }));
      expect(result).not.toContain('tech-stack.md');
    });

    test('should not include statistics section (moved to summary.md)', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).not.toContain('## Statistics');
    });

    test('should include total lines in header', () => {
      const result = generateSkillMd(createTestContext({ totalLines: 5000 }));
      expect(result).toContain('5000 lines');
    });
  });
});
