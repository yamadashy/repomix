import * as fs from 'node:fs/promises';
import os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mergeConfigs } from '../../../src/config/configLoad.js';
import type { RepomixConfigFile } from '../../../src/config/configSchema.js';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig } from '../../testing/testUtils.js';

/**
 * Integration tests for .ignore file behavior when customPatterns is defined.
 * Regression tests for issue #959.
 *
 * These tests use real file system operations to verify that all ignore sources
 * (.ignore, .repomixignore, customPatterns) are properly merged and applied
 * together, regardless of which sources are configured.
 */
describe('fileSearch - .ignore integration with customPatterns (#959)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-959-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should respect .ignore file when customPatterns is defined in config', async () => {
    // Setup: exact scenario from issue #959
    await fs.mkdir(path.join(tempDir, 'bin'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'spec', 'data'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'bin', 'test.sh'), 'bin content');
    await fs.writeFile(path.join(tempDir, 'spec', 'data', 'test.txt'), 'test content');
    await fs.writeFile(path.join(tempDir, 'src', 'main.js'), 'main content');
    await fs.writeFile(path.join(tempDir, '.ignore'), 'spec/data/\n');

    // Simulate: config file has { ignore: { customPatterns: ["bin/"] } }
    const fileConfig: RepomixConfigFile = {
      ignore: { customPatterns: ['bin/'] },
    };
    const config = mergeConfigs(tempDir, fileConfig, {});
    const testConfig = { ...config, ignore: { ...config.ignore, useGitignore: false, useDefaultPatterns: false } };

    const result = await searchFiles(tempDir, testConfig);

    // Both bin/ (from customPatterns) and spec/data/ (from .ignore) should be excluded
    expect(result.filePaths).not.toContain('bin/test.sh');
    expect(result.filePaths).not.toContain('spec/data/test.txt');
    expect(result.filePaths).toContain('src/main.js');
  });

  test('should respect .ignore file when customPatterns is empty', async () => {
    await fs.mkdir(path.join(tempDir, 'spec', 'data'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'spec', 'data', 'test.txt'), 'test content');
    await fs.writeFile(path.join(tempDir, 'src', 'main.js'), 'main content');
    await fs.writeFile(path.join(tempDir, '.ignore'), 'spec/data/\n');

    const config = createMockConfig({
      cwd: tempDir,
      ignore: {
        useGitignore: false,
        useDotIgnore: true,
        useDefaultPatterns: false,
        customPatterns: [],
      },
    });

    const result = await searchFiles(tempDir, config);

    expect(result.filePaths).not.toContain('spec/data/test.txt');
    expect(result.filePaths).toContain('src/main.js');
  });

  test('should not use .ignore when useDotIgnore is false', async () => {
    await fs.mkdir(path.join(tempDir, 'spec', 'data'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'spec', 'data', 'test.txt'), 'test content');
    await fs.writeFile(path.join(tempDir, 'src', 'main.js'), 'main content');
    await fs.writeFile(path.join(tempDir, '.ignore'), 'spec/data/\n');

    const config = createMockConfig({
      cwd: tempDir,
      ignore: {
        useGitignore: false,
        useDotIgnore: false,
        useDefaultPatterns: false,
        customPatterns: [],
      },
    });

    const result = await searchFiles(tempDir, config);

    // .ignore should NOT be respected when useDotIgnore is false
    expect(result.filePaths).toContain('spec/data/test.txt');
    expect(result.filePaths).toContain('src/main.js');
  });

  test('should merge all ignore sources together', async () => {
    await fs.mkdir(path.join(tempDir, 'dist'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'tmp'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'vendor'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'dist', 'bundle.js'), 'dist');
    await fs.writeFile(path.join(tempDir, 'tmp', 'cache.dat'), 'tmp');
    await fs.writeFile(path.join(tempDir, 'vendor', 'lib.js'), 'vendor');
    await fs.writeFile(path.join(tempDir, 'src', 'index.js'), 'src');
    await fs.writeFile(path.join(tempDir, '.ignore'), 'dist/\n');
    await fs.writeFile(path.join(tempDir, '.repomixignore'), 'tmp/\n');

    const config = createMockConfig({
      cwd: tempDir,
      ignore: {
        useGitignore: false,
        useDotIgnore: true,
        useDefaultPatterns: false,
        customPatterns: ['vendor/'],
      },
    });

    const result = await searchFiles(tempDir, config);

    // All three ignore sources should be merged
    expect(result.filePaths).not.toContain('dist/bundle.js');
    expect(result.filePaths).not.toContain('tmp/cache.dat');
    expect(result.filePaths).not.toContain('vendor/lib.js');
    expect(result.filePaths).toContain('src/index.js');
  });

  test('should respect .ignore in subdirectory when customPatterns is defined', async () => {
    await fs.mkdir(path.join(tempDir, 'src', 'generated'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'bin'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'app.js'), 'normal');
    await fs.writeFile(path.join(tempDir, 'src', 'generated', 'output.js'), 'generated');
    await fs.writeFile(path.join(tempDir, 'bin', 'run.sh'), 'bin');
    // Subdirectory .ignore file
    await fs.writeFile(path.join(tempDir, 'src', '.ignore'), 'generated/\n');

    const config = createMockConfig({
      cwd: tempDir,
      ignore: {
        useGitignore: false,
        useDotIgnore: true,
        useDefaultPatterns: false,
        customPatterns: ['bin/'],
      },
    });

    const result = await searchFiles(tempDir, config);

    expect(result.filePaths).not.toContain('bin/run.sh');
    expect(result.filePaths).not.toContain('src/generated/output.js');
    expect(result.filePaths).toContain('src/app.js');
  });
});
