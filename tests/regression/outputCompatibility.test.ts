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

describe.runIf(!isWindows)('Output Format Compatibility Tests', () => {
  let tempDir: string;
  const fixturesDir = path.join(__dirname, 'fixtures');
  const oldConfigsDir = path.join(fixturesDir, 'old-configs');
  const testProjectsDir = path.join(fixturesDir, 'test-projects');

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-output-compat-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('XML Output Compatibility', () => {
    test('should generate XML output without line limiting', async () => {
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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Verify XML structure
      expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(output).toContain('<repomix>');
      expect(output).toContain('<file_summary>');
      expect(output).toContain('<user_provided_header>');
      expect(output).toContain('<directory_structure>');
      expect(output).toContain('<files>');
      expect(output).toContain('</files>');
      expect(output).toContain('</repomix>');

      // Verify file content is included without truncation
      expect(output).toContain('const express = require');
      expect(output).toContain('"name": "simple-js-project"');
      expect(output).toContain('# Simple JavaScript Project');

      // Verify no truncation indicators
      expect(output).not.toContain('lines truncated');
      expect(output).not.toContain('content truncated');
    });

    test('should generate XML output with line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'xml' as RepomixOutputStyle,
            lineLimit: 10,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Verify XML structure is maintained
      expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(output).toContain('<repomix>');
      expect(output).toContain('<files>');

      // Content should be present (possibly truncated)
      expect(output).toContain('<file path=');
    });
  });

  describe('Markdown Output Compatibility', () => {
    test('should generate Markdown output without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'markdown' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Verify Markdown structure
      expect(output).toContain('# File Summary');
      expect(output).toContain('# User Provided Header');
      expect(output).toContain('# Directory Structure');
      expect(output).toContain('# Files');

      // Verify file content is included without truncation
      expect(output).toContain('## File: package.json');
      expect(output).toContain('## File: index.js');
      expect(output).toContain('## File: README.md');
      expect(output).toContain('const express = require');
      expect(output).toContain('"name": "simple-js-project"');
      expect(output).toContain('# Simple JavaScript Project');

      // Verify no truncation indicators
      expect(output).not.toContain('lines truncated');
      expect(output).not.toContain('content truncated');
    });

    test('should generate Markdown output with line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'markdown' as RepomixOutputStyle,
            lineLimit: 15,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Verify Markdown structure is maintained
      expect(output).toContain('# File Summary');
      expect(output).toContain('# Files');

      // Content should be present (possibly truncated)
      expect(output).toContain('## File:');
    });
  });

  describe('Plain Output Compatibility', () => {
    test('should generate plain output without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'plain' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Verify plain structure
      expect(output).toContain('File Summary');
      expect(output).toContain('User Provided Header');
      expect(output).toContain('Directory Structure');
      expect(output).toContain('Files');

      // Verify file content is included without truncation
      expect(output).toContain('File: package.json');
      expect(output).toContain('File: index.js');
      expect(output).toContain('File: README.md');
      expect(output).toContain('const express = require');
      expect(output).toContain('"name": "simple-js-project"');
      expect(output).toContain('Simple JavaScript Project');

      // Verify no truncation indicators
      expect(output).not.toContain('lines truncated');
      expect(output).not.toContain('content truncated');
    });
  });

  describe('JSON Output Compatibility', () => {
    test('should generate JSON output without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'json' as RepomixOutputStyle,
            fileSummary: true,
            directoryStructure: true,
            files: true,
          },
        },
      );

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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Verify JSON is valid
      const jsonOutput = JSON.parse(output);
      expect(jsonOutput).toBeDefined();
      expect(jsonOutput.fileSummary).toBeDefined();
      expect(jsonOutput.userProvidedHeader).toBeDefined();
      expect(jsonOutput.directoryStructure).toBeDefined();
      expect(jsonOutput.files).toBeDefined();

      // Verify file content is included without truncation
      expect(jsonOutput.files['package.json']).toContain('"name": "simple-js-project"');
      expect(jsonOutput.files['index.js']).toContain('const express = require');
      expect(jsonOutput.files['README.md']).toContain('Simple JavaScript Project');

      // Verify no truncation indicators in content
      expect(jsonOutput.files['package.json']).not.toContain('lines truncated');
      expect(jsonOutput.files['index.js']).not.toContain('content truncated');
    });
  });

  describe('Output Options Compatibility', () => {
    test('should handle showLineNumbers option without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'plain' as RepomixOutputStyle,
            showLineNumbers: true,
            files: true,
          },
        },
      );

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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Verify line numbers are included
      expect(output).toMatch(/\d+\s*:/); // Should contain line numbers
    });

    test('should handle removeComments option without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const config = mergeConfigs(
        testProjectDir,
        {},
        {
          output: {
            style: 'plain' as RepomixOutputStyle,
            removeComments: true,
            files: true,
          },
        },
      );

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

      const output = await generateOutput([testProjectDir], config, result.processedFiles, [
        'package.json',
        'index.js',
        'README.md',
      ]);

      // Comments should be removed
      expect(output).not.toContain('//');
    });
  });

  describe('Output Consistency', () => {
    test('should produce consistent output across formats without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const baseConfig = {
        fileSummary: true,
        directoryStructure: true,
        files: true,
      };

      const styles: RepomixOutputStyle[] = ['xml', 'markdown', 'plain', 'json'];
      const outputs: string[] = [];

      for (const style of styles) {
        const config = mergeConfigs(
          testProjectDir,
          {},
          {
            output: {
              style,
              ...baseConfig,
            },
          },
        );

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

        const output = await generateOutput([testProjectDir], config, result.processedFiles, [
          'package.json',
          'index.js',
          'README.md',
        ]);
        outputs.push(output);
      }

      // All outputs should contain the same file content
      for (const output of outputs) {
        expect(output).toContain('const express = require');
        expect(output).toContain('"name": "simple-js-project"');
        expect(output).toContain('Simple JavaScript Project');

        // None should have truncation indicators
        expect(output).not.toContain('lines truncated');
        expect(output).not.toContain('content truncated');
      }
    });
  });
});
