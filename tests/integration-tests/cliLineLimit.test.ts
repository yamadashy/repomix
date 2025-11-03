import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../src/cli/cliRun.js';
import { handleError, RepomixError } from '../../src/shared/errorHandle.js';
import { isWindows } from '../testing/testUtils.js';

describe.runIf(!isWindows)('CLI Line Limit Integration Tests', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-cli-line-limit-test-'));

    // Store original environment
    originalEnv = { ...process.env };

    // Mock console methods to capture output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit called with code: ${code}`);
    });
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Restore mocks
    vi.restoreAllMocks();

    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should parse --line option correctly', async () => {
    // Create a simple test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with valid line limit
    await expect(runCli([tempDir], tempDir, { line: 10 })).resolves.not.toThrow();

    // The test passes if no error is thrown during CLI processing
  });

  test('should reject invalid line limit values', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");');

    // Test with negative line limit
    await expect(runCli([tempDir], tempDir, { line: -5 })).rejects.toThrow(RepomixError);

    // Test with zero line limit
    await expect(runCli([tempDir], tempDir, { line: 0 })).rejects.toThrow(RepomixError);

    // Test with non-integer line limit (this should be caught by Commander.js validation)
    // We can't directly test this case here since Commander.js validates before our code runs
  });

  test('should handle line limit with different output formats', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Line 1");\n'.repeat(15));

    // Test with XML output
    await expect(runCli([tempDir], tempDir, { line: 10, style: 'xml' })).resolves.not.toThrow();

    // Test with Markdown output
    await expect(runCli([tempDir], tempDir, { line: 10, style: 'markdown' })).resolves.not.toThrow();

    // Test with Plain output
    await expect(runCli([tempDir], tempDir, { line: 10, style: 'plain' })).resolves.not.toThrow();

    // Test with JSON output
    await expect(runCli([tempDir], tempDir, { line: 10, style: 'json' })).resolves.not.toThrow();
  });

  test('should handle line limit with other CLI options', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with verbose mode
    await expect(runCli([tempDir], tempDir, { line: 10, verbose: true })).resolves.not.toThrow();

    // Test with copy to clipboard
    await expect(runCli([tempDir], tempDir, { line: 10, copy: true })).resolves.not.toThrow();

    // Test with remove comments
    await expect(runCli([tempDir], tempDir, { line: 10, removeComments: true })).resolves.not.toThrow();

    // Test with remove empty lines
    await expect(runCli([tempDir], tempDir, { line: 10, removeEmptyLines: true })).resolves.not.toThrow();

    // Test with compress
    await expect(runCli([tempDir], tempDir, { line: 10, compress: true })).resolves.not.toThrow();
  });

  test('should handle line limit with file selection options', async () => {
    // Create multiple test files
    await fs.writeFile(path.join(tempDir, 'test1.js'), 'console.log("Test 1");\n'.repeat(20));
    await fs.writeFile(path.join(tempDir, 'test2.ts'), 'console.log("Test 2");\n'.repeat(20));
    await fs.writeFile(path.join(tempDir, 'test3.md'), '# Test 3\n'.repeat(20));

    // Test with include pattern
    await expect(runCli([tempDir], tempDir, { line: 10, include: '*.js' })).resolves.not.toThrow();

    // Test with ignore pattern
    await expect(runCli([tempDir], tempDir, { line: 10, ignore: '*.md' })).resolves.not.toThrow();

    // Test with no gitignore
    await expect(runCli([tempDir], tempDir, { line: 10, gitignore: false })).resolves.not.toThrow();

    // Test with no default patterns
    await expect(runCli([tempDir], tempDir, { line: 10, defaultPatterns: false })).resolves.not.toThrow();
  });

  test('should handle line limit with output options', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with custom output file
    const outputFile = path.join(tempDir, 'custom-output.xml');
    await expect(runCli([tempDir], tempDir, { line: 10, output: outputFile })).resolves.not.toThrow();

    // Test with stdout
    await expect(runCli([tempDir], tempDir, { line: 10, stdout: true })).resolves.not.toThrow();

    // Test with show line numbers
    await expect(runCli([tempDir], tempDir, { line: 10, outputShowLineNumbers: true })).resolves.not.toThrow();

    // Test with parsable style
    await expect(runCli([tempDir], tempDir, { line: 10, parsableStyle: true })).resolves.not.toThrow();
  });

  test('should handle line limit with security options', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with security check disabled
    await expect(runCli([tempDir], tempDir, { line: 10, securityCheck: false })).resolves.not.toThrow();
  });

  test('should handle line limit with git options', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with no git sort by changes
    await expect(runCli([tempDir], tempDir, { line: 10, gitSortByChanges: false })).resolves.not.toThrow();

    // Test with include diffs
    await expect(runCli([tempDir], tempDir, { line: 10, includeDiffs: true })).resolves.not.toThrow();

    // Test with include logs
    await expect(runCli([tempDir], tempDir, { line: 10, includeLogs: true })).resolves.not.toThrow();

    // Test with include logs count
    await expect(runCli([tempDir], tempDir, { line: 10, includeLogsCount: 25 })).resolves.not.toThrow();
  });

  test('should handle line limit with token count options', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with token count encoding
    await expect(runCli([tempDir], tempDir, { line: 10, tokenCountEncoding: 'cl100k_base' })).resolves.not.toThrow();

    // Test with token count tree
    await expect(runCli([tempDir], tempDir, { line: 10, tokenCountTree: true })).resolves.not.toThrow();

    // Test with token count tree threshold
    await expect(runCli([tempDir], tempDir, { line: 10, tokenCountTree: 100 })).resolves.not.toThrow();
  });

  test('should handle line limit with top files length option', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with custom top files length
    await expect(runCli([tempDir], tempDir, { line: 10, topFilesLen: 20 })).resolves.not.toThrow();
  });

  test('should handle line limit with header text option', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with custom header text
    await expect(runCli([tempDir], tempDir, { line: 10, headerText: 'Custom Header Text' })).resolves.not.toThrow();
  });

  test('should handle line limit with instruction file path option', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    const instructionFile = path.join(tempDir, 'instructions.txt');
    await fs.writeFile(instructionFile, 'Custom instructions for AI');

    // Test with instruction file path
    await expect(runCli([tempDir], tempDir, { line: 10, instructionFilePath: instructionFile })).resolves.not.toThrow();
  });

  test('should handle line limit with directory structure options', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with include empty directories
    await expect(runCli([tempDir], tempDir, { line: 10, includeEmptyDirectories: true })).resolves.not.toThrow();

    // Test with include full directory structure
    await expect(runCli([tempDir], tempDir, { line: 10, includeFullDirectoryStructure: true })).resolves.not.toThrow();
  });

  test('should handle line limit with truncate base64 option', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test with truncate base64
    await expect(runCli([tempDir], tempDir, { line: 10, truncateBase64: true })).resolves.not.toThrow();
  });

  test('should handle line limit with multiple directories', async () => {
    // Create multiple directories with test files
    const dir1 = path.join(tempDir, 'dir1');
    const dir2 = path.join(tempDir, 'dir2');

    await fs.mkdir(dir1, { recursive: true });
    await fs.mkdir(dir2, { recursive: true });

    await fs.writeFile(path.join(dir1, 'test1.js'), 'console.log("Dir 1");\n'.repeat(20));
    await fs.writeFile(path.join(dir2, 'test2.js'), 'console.log("Dir 2");\n'.repeat(20));

    // Test with multiple directories
    await expect(runCli([dir1, dir2], tempDir, { line: 10 })).resolves.not.toThrow();
  });

  test('should handle line limit with stdin option', async () => {
    // Create a test file for stdin processing
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Mock stdin
    const mockStdin = {
      isTTY: false,
      setEncoding: vi.fn(),
      on: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      pipe: vi.fn(),
    };

    // Test with stdin (this might need additional mocking depending on implementation)
    await expect(runCli([tempDir], tempDir, { line: 10, stdin: true })).resolves.not.toThrow();
  });
});
