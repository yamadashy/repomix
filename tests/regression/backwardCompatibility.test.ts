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

describe.runIf(!isWindows)('Backward Compatibility Tests', () => {
  let tempDir: string;
  const fixturesDir = path.join(__dirname, 'fixtures');
  const oldConfigsDir = path.join(fixturesDir, 'old-configs');
  const testProjectsDir = path.join(fixturesDir, 'test-projects');

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-backward-compat-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Default Behavior Preservation', () => {
    test('should behave identically to previous versions when lineLimit is not specified', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Create a config without lineLimit (mimicking old behavior)
      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'xml',
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      // Verify lineLimit is undefined
      expect(config.output.lineLimit).toBeUndefined();

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

      // Verify no truncation occurred
      expect(result.processedFiles).toHaveLength(3); // index.js, package.json, README.md
      for (const file of result.processedFiles) {
        expect(file.truncation).toBeDefined();
        expect(file.truncation!.truncated).toBe(false);
        expect(file.truncation!.lineLimit).toBeUndefined();
      }
    });

    test('should handle null lineLimit as no limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Create a config with explicit null lineLimit
      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            lineLimit: undefined,
            style: 'xml',
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      // Verify lineLimit is null
      expect(config.output.lineLimit).toBeNull();

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

      // Verify no truncation occurred
      for (const file of result.processedFiles) {
        expect(file.truncation).toBeDefined();
        expect(file.truncation!.truncated).toBe(false);
        expect(file.truncation!.lineLimit).toBeNull();
      }
    });
  });

  describe('Configuration Loading Compatibility', () => {
    test('should load old config files without lineLimit property', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      // Verify old config loads correctly
      expect(fileConfig).toBeDefined();
      expect(fileConfig.output).toBeDefined();
      expect(fileConfig.output!.filePath).toBe('repomix-output.txt');
      expect(fileConfig.output!.headerText).toBe('Legacy configuration without lineLimit');
      expect(fileConfig.output!.lineLimit).toBeUndefined(); // Should not be present in old config
    });

    test('should merge old config with CLI options correctly', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {
        output: {
          style: 'markdown' as RepomixOutputStyle,
        },
      });

      // Verify old config values are preserved
      expect(mergedConfig.output.filePath).toBe('repomix-output.txt');
      expect(mergedConfig.output.headerText).toBe('Legacy configuration without lineLimit');
      expect(mergedConfig.output.lineLimit).toBeUndefined();

      // Verify CLI option is applied
      expect(mergedConfig.output.style).toBe('markdown');
    });
  });

  describe('Pipeline Integration Compatibility', () => {
    test('should process files identically without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Test without line limiting (default behavior)
      const configWithoutLimit = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'xml',
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

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

      // Test with explicit null lineLimit
      const configWithNullLimit = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            lineLimit: undefined,
            style: 'xml',
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      const resultWithNullLimit = await pack([testProjectDir], configWithNullLimit, () => {}, {
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

      // Results should be identical
      expect(resultWithoutLimit.totalFiles).toBe(resultWithNullLimit.totalFiles);
      expect(resultWithoutLimit.totalCharacters).toBe(resultWithNullLimit.totalCharacters);
      expect(resultWithoutLimit.totalTokens).toBe(resultWithNullLimit.totalTokens);

      // File contents should be identical
      for (let i = 0; i < resultWithoutLimit.processedFiles.length; i++) {
        const fileWithoutLimit = resultWithoutLimit.processedFiles[i];
        const fileWithNullLimit = resultWithNullLimit.processedFiles[i];

        expect(fileWithoutLimit.content).toBe(fileWithNullLimit.content);
        expect(fileWithoutLimit.truncation!.truncated).toBe(fileWithNullLimit.truncation!.truncated);
        expect(fileWithoutLimit.truncation!.lineLimit).toBe(fileWithNullLimit.truncation!.lineLimit);
      }
    });
  });

  describe('Error Handling Compatibility', () => {
    test('should maintain existing error handling patterns', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Test that existing error handling still works
      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'xml',
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

      // Should not throw when lineLimit is undefined
      await expect(
        pack([testProjectDir], config, () => {}, {
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
        }),
      ).resolves.toBeDefined();
    });
  });
});
