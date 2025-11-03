import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import { generateOutput } from '../../src/core/output/outputGenerate.js';
import { pack } from '../../src/core/packager.js';
import { copyToClipboardIfEnabled } from '../../src/core/packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from '../../src/core/packager/writeOutputToDisk.js';
import { filterOutUntrustedFiles } from '../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../src/core/security/validateFileSafety.js';
import { runCli } from '../../src/cli/cliRun.js';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import type { GitDiffResult } from '../../src/core/git/gitDiffHandle.js';
import type { FileCollectTask } from '../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../src/core/file/workers/fileCollectWorker.js';
import fileProcessWorker from '../../src/core/file/workers/fileProcessWorker.js';
import type { WorkerOptions } from '../../src/shared/processConcurrency.js';
import { isWindows } from '../testing/testUtils.js';

const mockCollectFileInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await fileCollectWorker(task as FileCollectTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe.runIf(!isWindows)('Line Limit Priority Order Integration Tests', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-line-limit-priority-test-'));
    
    // Store original environment
    originalEnv = { ...process.env };
    
    // Clear environment variable for clean testing
    delete process.env.REPOMIX_LINE_LIMIT;
    
    // Mock console methods to capture output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock clipboard functions
    vi.mock('../../src/core/packager/copyToClipboardIfEnabled.js');
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore mocks
    vi.restoreAllMocks();
    
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should prioritize CLI line limit over config file and environment', async () => {
    // Create config file with line limit
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '75';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with CLI option
    const result = await runCli([tempDir], tempDir, { line: 25 });

    // CLI should have highest priority
    expect(result && result.config.output.lineLimit).toBe(25);
  });

  test('should prioritize environment variable over config file when no CLI option', async () => {
    // Create config file with line limit
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '75';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run without CLI option
    const result = await runCli([tempDir], tempDir, {});

    // Environment should override config
    expect(result && result.config.output.lineLimit).toBe(75);
  });

  test('should use config file line limit when no CLI option or environment variable', async () => {
    // Create config file with line limit
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run without CLI option or environment variable
    const result = await runCli([tempDir], tempDir, {});

    // Should use config file value
    expect(result && result.config.output.lineLimit).toBe(50);
  });

  test('should use default when no CLI option, environment variable, or config file', async () => {
    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run without any line limit configuration
    const result = await runCli([tempDir], tempDir, {});

    // Should use default (undefined)
    expect(result && result.config.output.lineLimit).toBeUndefined();
  });

  test('should handle CLI line limit of zero as invalid and fall back to next priority', async () => {
    // Create config file with line limit
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '75';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // CLI with zero should be rejected before reaching our code (Commander.js validation)
    // This test verifies the validation happens at the CLI level
    await expect(
      runCli([tempDir], tempDir, { line: 0 })
    ).rejects.toThrow();
  });

  test('should handle invalid environment variable and fall back to config file', async () => {
    // Create config file with line limit
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set invalid environment variable
    process.env.REPOMIX_LINE_LIMIT = 'invalid';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Mock logger to capture warning
    const loggerSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Run without CLI option
    const result = await runCli([tempDir], tempDir, {});

    // Should fall back to config file value
    expect(result && result.config.output.lineLimit).toBe(50);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid REPOMIX_LINE_LIMIT environment variable')
    );

    loggerSpy.mockRestore();
  });

  test('should handle priority order with complex configuration merging', async () => {
    // Create comprehensive config file
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 60,
        style: 'markdown',
        fileSummary: false,
        directoryStructure: true,
        files: true,
        removeComments: true,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: true,
        truncateBase64: true,
        copyToClipboard: false,
        git: {
          sortByChanges: false,
          includeDiffs: true,
          includeLogs: true,
          includeLogsCount: 25,
        },
      },
      include: ['src/**/*.js', 'lib/**/*.ts'],
      ignore: {
        useGitignore: false,
        useDefaultPatterns: true,
        customPatterns: ['*.log', 'dist/**'],
      },
      security: {
        enableSecurityCheck: false,
      },
      tokenCount: {
        encoding: 'cl100k_base',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '80';

    // Create test files
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'test.js'),
      'console.log("Hello World");\n'.repeat(20)
    );

    // Run with CLI options that override some but not all settings
    const result = await runCli([tempDir], tempDir, {
      line: 40, // Should override both config and environment
      style: 'xml', // Should override config style
      verbose: true, // Should be added
      removeComments: false, // Should override config
    });

    // Verify priority order for line limit
    expect(result && result.config.output.lineLimit).toBe(40); // CLI wins

    // Verify other CLI overrides work
    expect(result && result.config.output.style).toBe('xml'); // CLI override
    expect(result && result.config.output.removeComments).toBe(false); // CLI override

    // Verify config file values are preserved when not overridden
    expect(result && result.config.output.fileSummary).toBe(false); // From config
    expect(result && result.config.output.directoryStructure).toBe(true); // From config
    expect(result && result.config.output.files).toBe(true); // From config
    expect(result && result.config.output.removeEmptyLines).toBe(false); // From config
    expect(result && result.config.output.compress).toBe(false); // From config
    expect(result && result.config.output.showLineNumbers).toBe(true); // From config
    expect(result && result.config.output.truncateBase64).toBe(true); // From config
    expect(result && result.config.output.copyToClipboard).toBe(false); // From config

    // Verify nested config merging
    expect(result && result.config.output.git?.sortByChanges).toBe(false); // From config
    expect(result && result.config.output.git?.includeDiffs).toBe(true); // From config
    expect(result && result.config.output.git?.includeLogs).toBe(true); // From config
    expect(result && result.config.output.git?.includeLogsCount).toBe(25); // From config

    // Verify other config sections
    expect(result && result.config.include).toEqual(['src/**/*.js', 'lib/**/*.ts']); // From config
    expect(result && result.config.ignore?.useGitignore).toBe(false); // From config
    expect(result && result.config.ignore?.useDefaultPatterns).toBe(true); // From config
    expect(result && result.config.ignore?.customPatterns).toEqual(['*.log', 'dist/**']); // From config
    expect(result && result.config.security?.enableSecurityCheck).toBe(false); // From config
    expect(result && result.config.tokenCount?.encoding).toBe('cl100k_base'); // From config
  });

  test('should handle priority order with end-to-end processing', async () => {
    // Create config file with line limit
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 15,
        style: 'xml',
        fileSummary: true,
        directoryStructure: true,
        files: true,
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '25';

    // Create test repository
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, 'large.js'),
      `// Large JavaScript file
function function1() {
  console.log('This is function 1');
  return 'result1';
}

function function2() {
  console.log('This is function 2');
  return 'result2';
}

function function3() {
  console.log('This is function 3');
  return 'result3';
}

function function4() {
  console.log('This is function 4');
  return 'result4';
}

function function5() {
  console.log('This is function 5');
  return 'result5';
}

const variable1 = 'This is a variable';
const variable2 = 'This is another variable';

export { function1, function2, function3, function4, function5, variable1, variable2 };`
    );

    // Run with CLI option
    const result = await runCli([tempDir], tempDir, { line: 8 });

    // Verify CLI has highest priority
    expect(result && result.config.output.lineLimit).toBe(8);

    // Run the complete packager workflow to verify line limiting works
    const packResult = await pack([srcDir], result!.config, () => {}, {
      searchFiles,
      sortPaths: (filePaths) => filePaths,
      collectFiles: (filePaths, rootDir, config, progressCallback) => {
        return collectFiles(filePaths, rootDir, config, progressCallback, {
          initTaskRunner: mockCollectFileInitTaskRunner,
        });
      },
      processFiles: async (rawFiles, config, _progressCallback) => {
        const processedFiles = [];
        for (const rawFile of rawFiles) {
          processedFiles.push(await fileProcessWorker({ rawFile, config }));
        }
        return processedFiles;
      },
      generateOutput,
      validateFileSafety: (rawFiles, progressCallback, config) => {
        const gitDiffMock: GitDiffResult = {
          workTreeDiffContent: '',
          stagedDiffContent: '',
        };
        return validateFileSafety(rawFiles, progressCallback, config, gitDiffMock, undefined, {
          runSecurityCheck: async () => [],
          filterOutUntrustedFiles,
        });
      },
      writeOutputToDisk,
      copyToClipboardIfEnabled,
      calculateMetrics: async (processedFiles, _output, _progressCallback, _config, _gitDiffResult, _gitLogResult) => {
        return {
          totalFiles: processedFiles.length,
          totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
          totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
          gitDiffTokenCount: 0,
          gitLogTokenCount: 0,
          fileCharCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileTokenCounts: processedFiles.reduce(
            (acc, file) => {
              acc[file.path] = file.content.split(/\s+/).length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          fileOriginalTokenCounts: processedFiles.reduce(
            (acc, file) => {
              if (file.originalContent) {
                acc[file.path] = file.originalContent.split(/\s+/).length;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          suspiciousGitLogResults: [],
          processedFiles,
          safeFilePaths: processedFiles.map((f) => f.path),
          skippedFiles: [],
        };
      },
    });

    // Verify that the CLI line limit was used in processing
    expect(packResult.processedFiles).toHaveLength(1);
    
    const fileResult = packResult.processedFiles.find((f) => f.path.includes('large.js'));
    expect(fileResult).toBeDefined();
    expect(fileResult!.truncation).toBeDefined();
    expect(fileResult!.truncation!.lineLimit).toBe(8); // CLI value should be used
  });

  test('should handle priority order with different config file formats', async () => {
    // Test with JavaScript config file
    const jsConfigPath = path.join(tempDir, 'repomix.config.js');
    const jsConfigContent = `
      export default {
        output: {
          lineLimit: 35,
          style: 'plain',
        },
      };
    `;
    await fs.writeFile(jsConfigPath, jsConfigContent);

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '45';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with CLI option
    const result = await runCli([tempDir], tempDir, { line: 20 });

    // CLI should still have highest priority regardless of config format
    expect(result && result.config.output.lineLimit).toBe(20);
  });

  test('should handle priority order with custom config file path', async () => {
    // Create custom config file
    const customConfigPath = path.join(tempDir, 'custom.config.json');
    const customConfigContent = {
      output: {
        lineLimit: 55,
        style: 'json',
      },
    };
    await fs.writeFile(customConfigPath, JSON.stringify(customConfigContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '65';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Run with CLI option and custom config path
    const result = await runCli([tempDir], tempDir, {
      line: 30,
      config: 'custom.config.json',
    });

    // CLI should have highest priority
    expect(result && result.config.output.lineLimit).toBe(30);
  });

  test('should handle priority order when environment variable is set but CLI is explicitly undefined', async () => {
    // Create config file with line limit
    const configPath = path.join(tempDir, 'repomix.config.json');
    const configContent = {
      output: {
        lineLimit: 50,
        style: 'xml',
      },
    };
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));

    // Set environment variable
    process.env.REPOMIX_LINE_LIMIT = '75';

    // Create test file
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");\n'.repeat(20));

    // Test mergeConfigs directly to verify behavior
    const fileConfig = await loadFileConfig(tempDir, null);
    const cliConfig = {}; // No line limit in CLI config
    
    const mergedConfig = mergeConfigs(tempDir, fileConfig, cliConfig);
    
    // Environment should override config when CLI doesn't specify line limit
    expect(mergedConfig.output.lineLimit).toBe(75);
  });
});