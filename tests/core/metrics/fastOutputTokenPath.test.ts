import { describe, expect, it } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { canUseFastOutputTokenPath, extractOutputWrapper } from '../../../src/core/metrics/calculateMetrics.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('extractOutputWrapper', () => {
  // Content-based fallback tests (no style parameter)
  it('should extract wrapper from output with file contents', () => {
    const files: ProcessedFile[] = [
      { path: 'a.ts', content: 'const a = 1;' },
      { path: 'b.ts', content: 'const b = 2;' },
    ];
    const output = '<header>const a = 1;<separator>const b = 2;<footer>';

    const wrapper = extractOutputWrapper(output, files);

    expect(wrapper).toBe('<header><separator><footer>');
  });

  it('should return null when file content is not found in output', () => {
    const files: ProcessedFile[] = [{ path: 'a.ts', content: 'not in output' }];
    const output = '<header>something else<footer>';

    expect(extractOutputWrapper(output, files)).toBeNull();
  });

  it('should skip empty file contents', () => {
    const files: ProcessedFile[] = [
      { path: 'empty.ts', content: '' },
      { path: 'a.ts', content: 'content-a' },
    ];
    const output = '<header>content-a<footer>';

    expect(extractOutputWrapper(output, files)).toBe('<header><footer>');
  });

  it('should handle identical content in multiple files by consuming in order', () => {
    const files: ProcessedFile[] = [
      { path: 'a.ts', content: 'same' },
      { path: 'b.ts', content: 'same' },
    ];
    const output = '<h1>same<h2>same<end>';

    expect(extractOutputWrapper(output, files)).toBe('<h1><h2><end>');
  });

  it('should return null when file order does not match output order', () => {
    const files: ProcessedFile[] = [
      { path: 'b.ts', content: 'BBB' },
      { path: 'a.ts', content: 'AAA' },
    ];
    const output = '<header>AAA<mid>BBB<footer>';

    expect(extractOutputWrapper(output, files)).toBeNull();
  });

  it('should handle output with no files', () => {
    const output = '<header><footer>';

    expect(extractOutputWrapper(output, [])).toBe('<header><footer>');
  });

  it('should handle output that is only file contents with no wrapper', () => {
    const files: ProcessedFile[] = [
      { path: 'a.ts', content: 'aaa' },
      { path: 'b.ts', content: 'bbb' },
    ];
    const output = 'aaabbb';

    expect(extractOutputWrapper(output, files)).toBe('');
  });

  // Tag-based fast path tests (with style parameter)
  describe('tag-based fast path', () => {
    it('should extract wrapper from XML output', () => {
      const files: ProcessedFile[] = [
        { path: 'a.ts', content: 'const a = 1;' },
        { path: 'b.ts', content: 'const b = 2;' },
      ];
      const output = '<files>\n<file path="a.ts">\nconst a = 1;\n</file>\n\n<file path="b.ts">\nconst b = 2;\n</file>\n</files>\n';

      const wrapper = extractOutputWrapper(output, files, 'xml');
      expect(wrapper).toBe('<files>\n<file path="a.ts">\n\n</file>\n\n<file path="b.ts">\n\n</file>\n</files>\n');
    });

    it('should extract wrapper from Markdown output', () => {
      const files: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      const output = '# Files\n\n## File: a.ts\n```typescript\nconst a = 1;\n```\n\n';

      const wrapper = extractOutputWrapper(output, files, 'markdown');
      expect(wrapper).toBe('# Files\n\n## File: a.ts\n```typescript\n\n```\n\n');
    });

    it('should extract wrapper from Plain output', () => {
      const files: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      const output = '================\nFile: a.ts\n================\nconst a = 1;\n\n';

      const wrapper = extractOutputWrapper(output, files, 'plain');
      expect(wrapper).toBe('================\nFile: a.ts\n================\n\n\n');
    });

    it('should fall back to content-based scan when tag not found', () => {
      const files: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      // Output has content but no matching tag
      const output = '<custom>const a = 1;</custom>';

      const wrapper = extractOutputWrapper(output, files, 'xml');
      expect(wrapper).toBe('<custom></custom>');
    });

    it('should fall back when content does not match at tag position', () => {
      const files: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      // Tag exists but content after tag doesn't match
      const output = '<file path="a.ts">\nconst b = 2;\n</file>';

      const wrapper = extractOutputWrapper(output, files, 'xml');
      // Falls back to content-based which also fails → null
      expect(wrapper).toBeNull();
    });

    it('should handle empty files in XML output', () => {
      const files: ProcessedFile[] = [
        { path: 'a.ts', content: 'hello' },
        { path: 'empty.ts', content: '' },
        { path: 'b.ts', content: 'world' },
      ];
      const output = '<file path="a.ts">\nhello\n</file>\n\n<file path="empty.ts">\n\n</file>\n\n<file path="b.ts">\nworld\n</file>\n';

      const wrapper = extractOutputWrapper(output, files, 'xml');
      expect(wrapper).toBe('<file path="a.ts">\n\n</file>\n\n<file path="empty.ts">\n\n</file>\n\n<file path="b.ts">\n\n</file>\n');
    });
  });
});

describe('canUseFastOutputTokenPath', () => {
  it('should return true for xml style', () => {
    const config = createMockConfig({ output: { style: 'xml' } });
    expect(canUseFastOutputTokenPath(config)).toBe(true);
  });

  it('should return true for markdown style', () => {
    const config = createMockConfig({ output: { style: 'markdown' } });
    expect(canUseFastOutputTokenPath(config)).toBe(true);
  });

  it('should return true for plain style', () => {
    const config = createMockConfig({ output: { style: 'plain' } });
    expect(canUseFastOutputTokenPath(config)).toBe(true);
  });

  it('should return false for json style', () => {
    const config = createMockConfig({ output: { style: 'json' } });
    expect(canUseFastOutputTokenPath(config)).toBe(false);
  });

  it('should return false when splitOutput is defined', () => {
    const config = createMockConfig({ output: { style: 'xml', splitOutput: 3 } });
    expect(canUseFastOutputTokenPath(config)).toBe(false);
  });

  it('should return false when parsableStyle is true', () => {
    const config = createMockConfig({ output: { style: 'xml', parsableStyle: true } });
    expect(canUseFastOutputTokenPath(config)).toBe(false);
  });
});
