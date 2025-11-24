import process from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { generateOutput } from '../../../src/core/output/outputGenerate.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('fs/promises');

describe('ellipsisPreservation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createTestFile = (path: string, content: string): ProcessedFile => ({
    path,
    content,
  });

  describe('XML style with Handlebars (parsableStyle: false)', () => {
    test('should preserve ... in TypeScript spread operator', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const arr = [...items];'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
      expect(output).not.toContain('[.items]');
    });

    test('should preserve ... in function rest parameters', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'function test(...args: any[]) { return args; }'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('...args');
      // Ensure ... is not replaced with single dot
      expect(output.includes('function test(...args')).toBe(true);
    });

    test('should preserve ... in object spread', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const obj = { ...props, name: "test" };'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('...props');
      // Ensure ... is not replaced with single dot
      expect(output.includes('{ ...props')).toBe(true);
    });

    test('should preserve standalone ...', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', '// ...\nconst x = 1;'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('// ...');
    });

    test('should preserve multiple ... in same file', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile(
          'test.ts',
          'function test(...args: any[]) {\n  const arr = [...args];\n  return { ...arr };\n}',
        ),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...args');
      expect(output).toContain('[...args]');
      expect(output).toContain('{ ...arr }');
      // Count occurrences of ...
      const ellipsisCount = (output.match(/\.\.\./g) || []).length;
      expect(ellipsisCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('XML style with XMLBuilder (parsableStyle: true)', () => {
    test('should preserve ... in TypeScript spread operator', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: true,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const arr = [...items];'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
      expect(output).not.toContain('[.items]');
    });

    test('should preserve ... in function rest parameters', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: true,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'function test(...args: any[]) { return args; }'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('...args');
      // Ensure ... is not replaced with single dot
      expect(output.includes('test(...args')).toBe(true);
    });
  });

  describe('JSON style', () => {
    test('should preserve ... in TypeScript code', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.json',
          style: 'json',
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const arr = [...items];'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
      expect(output).not.toContain('[.items]');
    });
  });

  describe('Markdown style', () => {
    test('should preserve ... in TypeScript code', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.md',
          style: 'markdown',
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const arr = [...items];'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
      expect(output).not.toContain('[.items]');
    });
  });

  describe('Plain style', () => {
    test('should preserve ... in TypeScript code', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.txt',
          style: 'plain',
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const arr = [...items];'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
      expect(output).not.toContain('[.items]');
    });
  });

  describe('Different programming languages', () => {
    test('should preserve ... in JavaScript', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.js', 'const arr = [...items];'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.js']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
    });

    test('should preserve ... in Go variadic functions', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.go', 'func test(args ...int) {}'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.go']);

      expect(output).toContain('...');
      expect(output).toContain('args ...');
    });

    test('should preserve ... in Python', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.py', '# ...\npass'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.py']);

      expect(output).toContain('...');
    });
  });

  describe('With removeComments option', () => {
    test('should preserve ... when removing comments', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          removeComments: true,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', '// Comment\nconst arr = [...items];'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
    });
  });

  describe('With removeEmptyLines option', () => {
    test('should preserve ... when removing empty lines', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          removeEmptyLines: true,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const arr = [...items];\n\nconst x = 1;'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('[...items]');
    });
  });

  describe('Edge cases', () => {
    test('should preserve four dots ....', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const x = "....";'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('....');
    });

    test('should preserve ... in strings', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const msg = "Loading...";'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('Loading...');
    });

    test('should preserve ... in template literals', async () => {
      const mockConfig = createMockConfig({
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: false,
          directoryStructure: false,
        },
      });

      const files: ProcessedFile[] = [
        createTestFile('test.ts', 'const msg = `Loading...`;'),
      ];

      const output = await generateOutput([process.cwd()], mockConfig, files, ['test.ts']);

      expect(output).toContain('...');
      expect(output).toContain('Loading...');
    });
  });
});
