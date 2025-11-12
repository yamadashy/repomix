import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import type { RepomixConfigFile, RepomixConfigMerged, RepomixOutputStyle } from '../../src/config/configSchema.js';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import type { ProcessedFile } from '../../src/core/file/fileTypes.js';
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

describe.runIf(!isWindows)('Performance Compatibility Tests', () => {
  let tempDir: string;
  const fixturesDir = path.join(__dirname, 'fixtures');
  const oldConfigsDir = path.join(fixturesDir, 'old-configs');
  const testProjectsDir = path.join(fixturesDir, 'test-projects');

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-perf-compat-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Baseline Performance Preservation', () => {
    test('should maintain similar performance without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Test performance without line limiting (baseline)
      const configWithoutLimit = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'xml' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      const startTimeWithoutLimit = performance.now();
      const resultWithoutLimit = await pack([testProjectDir], configWithoutLimit, () => {}, {
        searchFiles,
        sortPaths: (filePaths) => filePaths,
        collectFiles: (filePaths, rootDir, config, progressCallback) => {
          return collectFiles(filePaths, rootDir, config, progressCallback, {
            initTaskRunner: mockCollectFileInitTaskRunner,
          });
        },
        processFiles: async (rawFiles, config, _progressCallback) => {
          const processedFiles: ProcessedFile[] = [];
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
            fileOriginalTokenCounts: {},
          };
        },
      });
      const endTimeWithoutLimit = performance.now();
      const timeWithoutLimit = endTimeWithoutLimit - startTimeWithoutLimit;

      // Test performance with explicit undefined lineLimit
      const configWithUndefinedLimit = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            lineLimit: undefined,
            style: 'xml' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      const startTimeWithUndefinedLimit = performance.now();
      const resultWithUndefinedLimit = await pack([testProjectDir], configWithUndefinedLimit, () => {}, {
        searchFiles,
        sortPaths: (filePaths) => filePaths,
        collectFiles: (filePaths, rootDir, config, progressCallback) => {
          return collectFiles(filePaths, rootDir, config, progressCallback, {
            initTaskRunner: mockCollectFileInitTaskRunner,
          });
        },
        processFiles: async (rawFiles, config, _progressCallback) => {
          const processedFiles: ProcessedFile[] = [];
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
            fileOriginalTokenCounts: {},
          };
        },
      });
      const endTimeWithUndefinedLimit = performance.now();
      const timeWithUndefinedLimit = endTimeWithUndefinedLimit - startTimeWithUndefinedLimit;

      // Performance should be similar (within 20% tolerance)
      const performanceDifference = Math.abs(timeWithoutLimit - timeWithUndefinedLimit);
      const performanceRatio = performanceDifference / Math.max(timeWithoutLimit, timeWithUndefinedLimit);

      expect(performanceRatio).toBeLessThan(0.2); // Less than 20% difference

      // Results should be identical
      expect(resultWithoutLimit.totalFiles).toBe(resultWithUndefinedLimit.totalFiles);
      expect(resultWithoutLimit.totalCharacters).toBe(resultWithUndefinedLimit.totalCharacters);
      expect(resultWithoutLimit.totalTokens).toBe(resultWithUndefinedLimit.totalTokens);
    });

    test('should handle memory usage efficiently without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'xml' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      // Measure memory before
      const initialMemory = process.memoryUsage();

      const result = await pack([testProjectDir], config, () => {}, {
        searchFiles,
        sortPaths: (filePaths) => filePaths,
        collectFiles: (filePaths, rootDir, config, progressCallback) => {
          return collectFiles(filePaths, rootDir, config, progressCallback, {
            initTaskRunner: mockCollectFileInitTaskRunner,
          });
        },
        processFiles: async (rawFiles, config, _progressCallback) => {
          const processedFiles: ProcessedFile[] = [];
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
            fileOriginalTokenCounts: {},
          };
        },
      });

      // Measure memory after
      const finalMemory = process.memoryUsage();

      // Memory usage should be reasonable (less than 50MB increase)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

      // Verify processing completed successfully
      expect(result.totalFiles).toBe(3);
      expect(result.totalCharacters).toBeGreaterThan(0);
    });
  });

  describe('Performance with Line Limiting', () => {
    test('should handle line limiting without performance degradation', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Test with line limiting enabled
      const configWithLineLimit = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            lineLimit: 50,
            style: 'xml' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      const startTimeWithLineLimit = performance.now();
      const resultWithLineLimit = await pack([testProjectDir], configWithLineLimit, () => {}, {
        searchFiles,
        sortPaths: (filePaths) => filePaths,
        collectFiles: (filePaths, rootDir, config, progressCallback) => {
          return collectFiles(filePaths, rootDir, config, progressCallback, {
            initTaskRunner: mockCollectFileInitTaskRunner,
          });
        },
        processFiles: async (rawFiles, config, _progressCallback) => {
          const processedFiles: ProcessedFile[] = [];
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
            fileOriginalTokenCounts: {},
          };
        },
      });
      const endTimeWithLineLimit = performance.now();
      const timeWithLineLimit = endTimeWithLineLimit - startTimeWithLineLimit;

      // Test without line limiting for comparison
      const configWithoutLineLimit = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'xml' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      const startTimeWithoutLineLimit = performance.now();
      const resultWithoutLineLimit = await pack([testProjectDir], configWithoutLineLimit, () => {}, {
        searchFiles,
        sortPaths: (filePaths) => filePaths,
        collectFiles: (filePaths, rootDir, config, progressCallback) => {
          return collectFiles(filePaths, rootDir, config, progressCallback, {
            initTaskRunner: mockCollectFileInitTaskRunner,
          });
        },
        processFiles: async (rawFiles, config, _progressCallback) => {
          const processedFiles: ProcessedFile[] = [];
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
            fileOriginalTokenCounts: {},
          };
        },
      });
      const endTimeWithoutLineLimit = performance.now();
      const timeWithoutLineLimit = endTimeWithoutLineLimit - startTimeWithoutLineLimit;

      // Line limiting should not cause significant performance degradation
      // Allow up to 50% performance difference due to line limiting overhead
      const performanceRatio = timeWithLineLimit / timeWithoutLineLimit;
      expect(performanceRatio).toBeLessThan(1.5); // Less than 50% slower

      // Both should complete successfully
      expect(resultWithLineLimit.totalFiles).toBe(3);
      expect(resultWithoutLineLimit.totalFiles).toBe(3);
    });

    test('should handle different line limits efficiently', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const lineLimits = [10, 25, 50, 100, 500];
      const times: number[] = [];

      for (const lineLimit of lineLimits) {
        const config = mergeConfigs(
          testProjectDir,
          {},
          {
            output: {
              lineLimit,
              style: 'xml' as RepomixOutputStyle,
              fileSummary: true,
              directoryStructure: true,
              files: true,
            },
          },
        );

        const startTime = performance.now();
        const result = await pack([testProjectDir], config, () => {}, {
          searchFiles,
          sortPaths: (filePaths) => filePaths,
          collectFiles: (filePaths, rootDir, config, progressCallback) => {
            return collectFiles(filePaths, rootDir, config, progressCallback, {
              initTaskRunner: mockCollectFileInitTaskRunner,
            });
          },
          processFiles: async (rawFiles, config, _progressCallback) => {
            const processedFiles: ProcessedFile[] = [];
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
              fileOriginalTokenCounts: {},
            };
          },
        });
        const endTime = performance.now();

        times.push(endTime - startTime);

        // All should complete successfully
        expect(result.totalFiles).toBe(3);
      }

      // Performance should scale reasonably with line limit
      // Higher limits should generally be faster (less processing overhead)
      // But the difference should not be extreme
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const timeRatio = maxTime / minTime;

      expect(timeRatio).toBeLessThan(3); // Less than 3x difference
    });
  });

  describe('Output Format Performance', () => {
    test('should maintain consistent performance across output formats', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const outputStyles: RepomixOutputStyle[] = ['xml', 'markdown', 'plain', 'json'];
      const times: Record<RepomixOutputStyle, number> = {} as any;

      for (const style of outputStyles) {
        const config = mergeConfigs(
          testProjectDir,
          {},
          {
            output: {
              style,
              fileSummary: true,
              directoryStructure: true,
              files: true,
            },
          },
        );

        const startTime = performance.now();
        const result = await pack([testProjectDir], config, () => {}, {
          searchFiles,
          sortPaths: (filePaths) => filePaths,
          collectFiles: (filePaths, rootDir, config, progressCallback) => {
            return collectFiles(filePaths, rootDir, config, progressCallback, {
              initTaskRunner: mockCollectFileInitTaskRunner,
            });
          },
          processFiles: async (rawFiles, config, _progressCallback) => {
            const processedFiles: ProcessedFile[] = [];
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
              fileOriginalTokenCounts: {},
            };
          },
        });
        const endTime = performance.now();

        times[style] = endTime - startTime;

        // All should complete successfully
        expect(result.totalFiles).toBe(3);
      }

      // Performance should be consistent across formats
      const maxTime = Math.max(...Object.values(times));
      const minTime = Math.min(...Object.values(times));
      const timeRatio = maxTime / minTime;

      expect(timeRatio).toBeLessThan(2); // Less than 2x difference
    });
  });

  describe('Scalability Performance', () => {
    test('should handle multiple files efficiently without line limiting', async () => {
      // Create a larger test project with multiple files
      const largeTestDir = path.join(tempDir, 'large-project');
      await fs.mkdir(largeTestDir, { recursive: true });

      // Create multiple JavaScript files
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(
          path.join(largeTestDir, `file${i}.js`),
          `// File ${i}
function test${i}() {
  console.log('This is test file ${i}');
  return ${i};
}

module.exports = test${i};
`,
        );
      }

      const config = mergeConfigs(
        largeTestDir,
        {},
        {
          output: {
            style: 'xml' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      const startTime = performance.now();
      const result = await pack([largeTestDir], config, () => {}, {
        searchFiles,
        sortPaths: (filePaths) => filePaths,
        collectFiles: (filePaths, rootDir, config, progressCallback) => {
          return collectFiles(filePaths, rootDir, config, progressCallback, {
            initTaskRunner: mockCollectFileInitTaskRunner,
          });
        },
        processFiles: async (rawFiles, config, _progressCallback) => {
          const processedFiles: ProcessedFile[] = [];
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
            fileOriginalTokenCounts: {},
          };
        },
      });
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should handle multiple files efficiently
      expect(result.totalFiles).toBe(10);
      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds

      // Performance should scale reasonably (less than 500ms per file)
      const timePerFile = processingTime / result.totalFiles;
      expect(timePerFile).toBeLessThan(500); // Less than 500ms per file
    });
  });
});
