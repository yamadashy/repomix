import { describe, expect, test } from 'vitest';
import { generateSkillMd } from '../../../src/core/skill/skillStyle.js';

describe('skillStyle', () => {
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

    test('should include the standard sections', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).toContain('## Overview');
      expect(result).toContain('## Files');
      expect(result).toContain('| File | Contents |');
      expect(result).toContain('## How to Use');
      expect(result).toContain('### 1. Find file locations');
      expect(result).toContain('### 2. Read file contents');
      expect(result).toContain('### 3. Search for code');
      expect(result).toContain('## Common Use Cases');
      expect(result).toContain('## Tips');
    });

    test('should reference multiple files', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).toContain('references/summary.md');
      expect(result).toContain('references/project-structure.md');
      expect(result).toContain('references/files.md');
    });

    test('should end with newline', () => {
      const result = generateSkillMd(createTestContext());
      expect(result.endsWith('\n')).toBe(true);
    });

    test('should not include git sections (skill output is for reference codebases)', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).not.toContain('git-diffs.md');
      expect(result).not.toContain('git-logs.md');
    });

    test('should include tech-stack reference when hasTechStack is true', () => {
      const result = generateSkillMd(createTestContext({ hasTechStack: true }));
      expect(result).toContain('`references/tech-stacks.md`');
    });

    test('should not include tech-stack reference when hasTechStack is false', () => {
      const result = generateSkillMd(createTestContext({ hasTechStack: false }));
      expect(result).not.toContain('tech-stacks.md');
    });

    test('should not include statistics section (moved to summary.md)', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).not.toContain('## Statistics');
    });

    test('should include total lines in header', () => {
      const result = generateSkillMd(createTestContext({ totalLines: 5000 }));
      expect(result).toContain('5000 lines');
    });

    test('should include source link when sourceUrl is provided', () => {
      const result = generateSkillMd(
        createTestContext({
          projectName: 'My Project',
          sourceUrl: 'https://github.com/example/my-project',
        }),
      );
      expect(result).toContain('from [My Project](https://github.com/example/my-project)');
    });

    test('should not include source link when sourceUrl is omitted', () => {
      const result = generateSkillMd(createTestContext());
      expect(result).not.toContain(' from [');
    });
  });
});
