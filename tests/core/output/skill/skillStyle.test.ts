import { describe, expect, test } from 'vitest';
import { generateSkillMd, getSkillTemplate } from '../../../../src/core/output/skill/skillStyle.js';

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

    test('should include statistics section', () => {
      const template = getSkillTemplate();
      expect(template).toContain('## Statistics');
      expect(template).toContain('Total Files');
      expect(template).toContain('Total Tokens');
    });

    test('should include how to use section', () => {
      const template = getSkillTemplate();
      expect(template).toContain('## How to Use');
      expect(template).toContain('Understand the layout');
    });

    test('should reference multiple files', () => {
      const template = getSkillTemplate();
      expect(template).toContain('references/summary.md');
      expect(template).toContain('references/structure.md');
      expect(template).toContain('references/files.md');
    });
  });

  describe('generateSkillMd', () => {
    test('should generate SKILL.md with all fields', () => {
      const context = {
        skillName: 'my-project-skill',
        skillDescription: 'Reference codebase for My Project.',
        projectName: 'My Project',
        totalFiles: 42,
        totalTokens: 12345,
      };

      const result = generateSkillMd(context);

      // Check YAML frontmatter
      expect(result).toContain('---');
      expect(result).toContain('name: my-project-skill');
      expect(result).toContain('description: Reference codebase for My Project.');

      // Check content
      expect(result).toContain('# My Project Codebase Reference');
      expect(result).toContain('Total Files: 42');
      expect(result).toContain('Total Tokens: 12345');
    });

    test('should end with newline', () => {
      const context = {
        skillName: 'test-skill',
        skillDescription: 'Test description',
        projectName: 'Test Project',
        totalFiles: 1,
        totalTokens: 100,
      };

      const result = generateSkillMd(context);
      expect(result.endsWith('\n')).toBe(true);
    });

    test('should include references to multiple files', () => {
      const context = {
        skillName: 'test-skill',
        skillDescription: 'Test description',
        projectName: 'Test Project',
        totalFiles: 1,
        totalTokens: 100,
      };

      const result = generateSkillMd(context);
      expect(result).toContain('`references/summary.md`');
      expect(result).toContain('`references/structure.md`');
      expect(result).toContain('`references/files.md`');
    });

    test('should not include git sections (skill output is for reference codebases)', () => {
      const context = {
        skillName: 'test-skill',
        skillDescription: 'Test description',
        projectName: 'Test Project',
        totalFiles: 1,
        totalTokens: 100,
      };

      const result = generateSkillMd(context);
      expect(result).not.toContain('git-diffs.md');
      expect(result).not.toContain('git-logs.md');
    });
  });
});
