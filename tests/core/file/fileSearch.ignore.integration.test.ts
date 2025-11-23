import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, test, afterEach } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('fileSearch - .ignore integration', () => {
  const testDir = path.join(process.cwd(), 'tests/fixtures/ignore-test-temp');

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  test('should respect .ignore file when customPatterns is defined in config', async () => {
    // Setup test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'bin'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'spec', 'data'), { recursive: true });

    // Create test files
    await fs.writeFile(path.join(testDir, 'bin', 'test.sh'), 'bin content');
    await fs.writeFile(path.join(testDir, 'spec', 'data', 'test.txt'), 'test content');
    await fs.writeFile(path.join(testDir, 'main.js'), 'main content');

    // Create .ignore file
    await fs.writeFile(path.join(testDir, '.ignore'), 'spec/data/\n');

    // Create config with customPatterns
    const config = createMockConfig({
      ignore: {
        useGitignore: false,
        useDotIgnore: true,
        useDefaultPatterns: false,
        customPatterns: ['bin/'],
      },
    });

    const result = await searchFiles(testDir, config);

    // Both bin/ (from customPatterns) and spec/data/ (from .ignore) should be excluded
    expect(result.filePaths).not.toContain('bin/test.sh');
    expect(result.filePaths).not.toContain('spec/data/test.txt');
    expect(result.filePaths).toContain('main.js');
    expect(result.filePaths).toContain('.ignore');
  });

  test('should respect .ignore file when customPatterns is empty', async () => {
    // Setup test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'spec', 'data'), { recursive: true });

    // Create test files
    await fs.writeFile(path.join(testDir, 'spec', 'data', 'test.txt'), 'test content');
    await fs.writeFile(path.join(testDir, 'main.js'), 'main content');

    // Create .ignore file
    await fs.writeFile(path.join(testDir, '.ignore'), 'spec/data/\n');

    // Create config without customPatterns
    const config = createMockConfig({
      ignore: {
        useGitignore: false,
        useDotIgnore: true,
        useDefaultPatterns: false,
        customPatterns: [],
      },
    });

    const result = await searchFiles(testDir, config);

    // spec/data/ (from .ignore) should be excluded
    expect(result.filePaths).not.toContain('spec/data/test.txt');
    expect(result.filePaths).toContain('main.js');
    expect(result.filePaths).toContain('.ignore');
  });

  test('should not use .ignore when useDotIgnore is false', async () => {
    // Setup test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'spec', 'data'), { recursive: true });

    // Create test files
    await fs.writeFile(path.join(testDir, 'spec', 'data', 'test.txt'), 'test content');
    await fs.writeFile(path.join(testDir, 'main.js'), 'main content');

    // Create .ignore file
    await fs.writeFile(path.join(testDir, '.ignore'), 'spec/data/\n');

    // Create config with useDotIgnore: false
    const config = createMockConfig({
      ignore: {
        useGitignore: false,
        useDotIgnore: false,
        useDefaultPatterns: false,
        customPatterns: [],
      },
    });

    const result = await searchFiles(testDir, config);

    // spec/data/ should NOT be excluded because useDotIgnore is false
    expect(result.filePaths).toContain('spec/data/test.txt');
    expect(result.filePaths).toContain('main.js');
    expect(result.filePaths).toContain('.ignore');
  });
});
