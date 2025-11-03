import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../src/cli/cliRun.js';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import type { FileCollectTask } from '../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../src/core/file/workers/fileCollectWorker.js';
import fileProcessWorker from '../../src/core/file/workers/fileProcessWorker.js';
import type { GitDiffResult } from '../../src/core/git/gitDiffHandle.js';
import { generateOutput } from '../../src/core/output/outputGenerate.js';
import { copyToClipboardIfEnabled } from '../../src/core/packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from '../../src/core/packager/writeOutputToDisk.js';
import { pack } from '../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../src/core/security/validateFileSafety.js';
import { handleError, RepomixError } from '../../src/shared/errorHandle.js';
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

describe.runIf(!isWindows)('Line Limit Error Handling Integration Tests', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-line-limit-error-test-'));

    // Store original environment
    originalEnv = { ...process.env };

    // Clear environment variable for clean testing
    delete process.env.REPOMIX_LINE_LIMIT;

    // Mock console methods to capture output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit called with code: ${code}`);
    });

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

  test('should handle invalid CLI line limit values gracefully', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");');

    // Test with negative line limit
    await expect(runCli([tempDir], tempDir, { line: -5 })).rejects.toThrow(RepomixError);

    // Test with zero line limit
    await expect(runCli([tempDir], tempDir, { line: 0 })).rejects.toThrow(RepomixError);
  });

  test('should handle invalid config file line limit values', async () => {
    const configPath = path.join(tempDir, 'repomix.config.json');

    // Test negative line limit in config
    const invalidConfig = {
      output: {
        lineLimit: -10,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

    await expect(loadFileConfig(tempDir, null)).rejects.toThrow();

    // Test zero line limit in config
    const invalidConfig2 = {
      output: {
        lineLimit: 0,
        style: 'xml',
      },
    };

    await fs.writeFile(configPath, JSON.stringify(invalidConfig2, null, 2));

    await expect(loadFileConfig(tempDir, null)).rejects.toThrow();
  });

  test('should handle invalid environment variable line limit', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'console.log("Hello World");');

    // Set invalid environment variable
    process.env.REPOMIX_LINE_LIMIT = 'invalid';

    const fileConfig = await loadFileConfig(tempDir, null);
    const cliConfig = {};

    // Mock logger to capture warning
    const loggerSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mergedConfig = mergeConfigs(tempDir, fileConfig, cliConfig);

    expect(mergedConfig.output.lineLimit).toBeUndefined();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid REPOMIX_LINE_LIMIT environment variable'));

    loggerSpy.mockRestore();
  });

  test('should handle line limit processing errors gracefully', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a test file
    await fs.writeFile(
      path.join(srcDir, 'test.js'),
      `// Test file
function test() {
  console.log('This is a test');
  return 'test result';
}

module.exports = test;`,
    );

    // Mock the line limit processor to throw an error
    vi.doMock('../../src/core/file/lineLimitProcessor.js', () => ({
      applyLineLimit: vi.fn().mockRejectedValue(new Error('Line limit processing failed')),
    }));

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 5,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    // The packager should handle the error gracefully and fall back to original content
    const result = await pack([srcDir], config, () => {}, {
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

    // Verify that processing completed despite the error
    expect(result.processedFiles).toHaveLength(1);

    // Verify that the file has original content (fallback behavior)
    const fileResult = result.processedFiles.find((f) => f.path.includes('test.js'));
    expect(fileResult).toBeDefined();
    expect(fileResult!.content).toContain('function test()');
  });

  test('should handle malformed files with line limiting', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a malformed JavaScript file
    await fs.writeFile(
      path.join(srcDir, 'malformed.js'),
      `// Malformed JavaScript file
function broken() {
  console.log('This is broken'
  // Missing closing parenthesis and brace
  return 'broken';`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 5,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    // Should handle malformed files gracefully
    const result = await pack([srcDir], config, () => {}, {
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

    // Verify that processing completed
    expect(result.processedFiles).toHaveLength(1);

    // Verify that the file was processed (even if line limiting failed)
    const fileResult = result.processedFiles.find((f) => f.path.includes('malformed.js'));
    expect(fileResult).toBeDefined();
  });

  test('should handle binary files with line limiting', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a binary file (simulated)
    const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
    await fs.writeFile(path.join(srcDir, 'binary.png'), binaryContent);

    // Create a text file
    await fs.writeFile(
      path.join(srcDir, 'text.js'),
      `// Text file
console.log('This is a text file');`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 5,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    // Should handle mixed file types gracefully
    const result = await pack([srcDir], config, () => {}, {
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

    // Should process text files and handle binary files appropriately
    expect(result.processedFiles.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle very large line limits', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a small file
    await fs.writeFile(
      path.join(srcDir, 'small.js'),
      `// Small file
console.log('Hello World');`,
    );

    // Test with very large line limit
    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 999999,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    const result = await pack([srcDir], config, () => {}, {
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

    // Should handle large line limits without issues
    expect(result.processedFiles).toHaveLength(1);

    const fileResult = result.processedFiles.find((f) => f.path.includes('small.js'));
    expect(fileResult).toBeDefined();
    expect(fileResult!.truncation).toBeDefined();
    expect(fileResult!.truncation!.lineLimit).toBe(999999);
    expect(fileResult!.truncation!.truncated).toBe(false); // Should not truncate small file
  });

  test('should handle line limit with permission errors', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a test file
    await fs.writeFile(
      path.join(srcDir, 'test.js'),
      `// Test file
console.log('Hello World');`,
    );

    // Mock file processing to simulate permission error
    const originalProcessWorker = fileProcessWorker;
    vi.doMock('../../src/core/file/workers/fileProcessWorker.js', () => ({
      default: vi.fn().mockRejectedValue(new Error('Permission denied')),
    }));

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 5,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    // Should handle permission errors gracefully
    await expect(
      pack([srcDir], config, () => {}, {
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
        calculateMetrics: async (
          processedFiles,
          _output,
          _progressCallback,
          _config,
          _gitDiffResult,
          _gitLogResult,
        ) => {
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
      }),
    ).rejects.toThrow();
  });

  test('should handle line limit with empty files', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create an empty file
    await fs.writeFile(path.join(srcDir, 'empty.js'), '');

    // Create a normal file
    await fs.writeFile(
      path.join(srcDir, 'normal.js'),
      `// Normal file
console.log('Hello World');`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 5,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    const result = await pack([srcDir], config, () => {}, {
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

    // Should handle empty files without issues
    expect(result.processedFiles.length).toBeGreaterThanOrEqual(1);

    const emptyFileResult = result.processedFiles.find((f) => f.path.includes('empty.js'));
    if (emptyFileResult) {
      expect(emptyFileResult.truncation).toBeDefined();
      expect(emptyFileResult.truncation!.truncated).toBe(false);
    }
  });

  test('should handle line limit with special characters', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create a file with special characters
    await fs.writeFile(
      path.join(srcDir, 'special.js'),
      `// File with special characters: é, ñ, ü, 中文, 🚀
const specialChars = 'é ñ ü 中文 🚀';
const emoji = '🎉🎊🎈';
const unicode = 'Unicode test: αβγδεζηθ';

console.log(specialChars);
console.log(emoji);
console.log(unicode);`,
    );

    const config = mergeConfigs(
      tempDir,
      {},
      {
        output: {
          lineLimit: 5,
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          files: true,
        },
      },
    );

    const result = await pack([srcDir], config, () => {}, {
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

    // Should handle special characters without issues
    expect(result.processedFiles).toHaveLength(1);

    const fileResult = result.processedFiles.find((f) => f.path.includes('special.js'));
    expect(fileResult).toBeDefined();
    expect(fileResult!.truncation).toBeDefined();
  });
});
