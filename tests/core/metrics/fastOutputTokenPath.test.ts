import { describe, expect, it } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { canUseFastOutputTokenPath, extractOutputWrapper } from '../../../src/core/metrics/calculateMetrics.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('extractOutputWrapper', () => {
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
