import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// Mock globby worker for integration tests to avoid worker file loading issues

import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import type { RepomixConfigFile, RepomixConfigMerged, RepomixOutputStyle } from '../../src/config/configSchema.js';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import type { ProcessedFile } from '../../src/core/file/fileTypes.js';

import type { FileCollectTask } from '../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../src/core/file/workers/fileCollectWorker.js';
import fileProcessWorker from '../../src/core/file/workers/fileProcessWorker.js';
import type { GitDiffResult } from '../../src/core/git/gitDiffHandle.js';
import { produceOutput } from '../../src/core/packager/produceOutput.js';
import { pack } from '../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../src/core/security/validateFileSafety.js';
import type { WorkerOptions } from '../../src/shared/processConcurrency.js';
import { isWindows } from '../testing/testUtils.js';

const fixturesDir = path.join(__dirname, 'fixtures', 'packager');
const inputsDir = path.join(fixturesDir, 'inputs');
const outputsDir = path.join(fixturesDir, 'outputs');

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

describe.runIf(!isWindows)('packager integration', () => {
  const testCases = [
    {
      desc: 'simple plain style',
      input: 'simple-project',
      output: 'simple-project-output.txt',
      config: {
        output: { style: 'plain', filePath: 'simple-project-output.txt' },
      },
    },
    {
      desc: 'simple xml style',
      input: 'simple-project',
      output: 'simple-project-output.xml',
      config: {
        output: { style: 'xml', filePath: 'simple-project-output.xml' },
      },
    },
    {
      desc: 'simple markdown style',
      input: 'simple-project',
      output: 'simple-project-output.md',
      config: {
        output: { style: 'markdown', filePath: 'simple-project-output.md' },
      },
    },
    {
      desc: 'simple json style',
      input: 'simple-project',
      output: 'simple-project-output.json',
      config: {
        output: { style: 'json', filePath: 'simple-project-output.json' },
      },
    },
  ];

  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-test-'));
  });

  afterEach(async () => {
    // Clean up the temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  for (const { desc, input, output, config } of testCases) {
    test(`should correctly pack ${desc}`, async () => {
      const inputDir = path.join(inputsDir, input);
      const expectedOutputPath = path.join(outputsDir, output);
      const actualOutputPath = path.join(tempDir, output);

      const fileConfig: RepomixConfigFile = await loadFileConfig(inputDir, null);
      const mergedConfig: RepomixConfigMerged = mergeConfigs(process.cwd(), fileConfig, {
        output: {
          filePath: actualOutputPath,
          style: (config.output?.style || 'plain') as RepomixOutputStyle,
          git: { sortByChanges: false },
        },
      });

      // Run the pack function
      await pack([inputDir], mergedConfig, () => {}, {
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
        produceOutput,
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
            suspiciousFilesResults: [],
            suspiciousGitDiffResults: [],
          };
        },
      });

      // Read the actual and expected outputs
      const actualOutput = await fs.readFile(actualOutputPath, 'utf-8');

      // Compare the outputs - styles (e.g., XML, plain, markdown) may differ
      expect(actualOutput).toContain('This file is a merged representation of the entire codebase');

      // Common assertions for all styles
      expect(actualOutput).toContain('resources/');
      expect(actualOutput).toContain('src/');
      expect(actualOutput).toContain('This repository is simple-project');

      switch (config.output?.style) {
        case 'xml':
          expect(actualOutput).toContain('<file_summary>');
          expect(actualOutput).toContain('<user_provided_header>');
          expect(actualOutput).toContain('</user_provided_header>');
          expect(actualOutput).toContain('<directory_structure>');
          expect(actualOutput).toContain('<file path="src/index.js">');
          expect(actualOutput).toContain('function main() {');
          expect(actualOutput).toContain('<file path="src/utils.js">');
          expect(actualOutput).toContain('function greet(name) {');
          break;

        case 'markdown':
          expect(actualOutput).toContain('# File Summary');
          expect(actualOutput).toContain('# User Provided Header');
          expect(actualOutput).toContain('# Directory Structure');
          expect(actualOutput).toContain('## File: src/index.js');
          expect(actualOutput).toContain('````javascript\nconst { greet }');
          expect(actualOutput).toContain('## File: src/utils.js');
          expect(actualOutput).toContain('````javascript\nfunction greet(name) {');
          break;

        case 'plain':
          expect(actualOutput).toContain('File Summary');
          expect(actualOutput).toContain('User Provided Header');
          expect(actualOutput).toContain('Directory Structure');
          expect(actualOutput).toContain('File: src/index.js');
          expect(actualOutput).toContain('function main() {');
          expect(actualOutput).toContain('File: src/utils.js');
          expect(actualOutput).toContain('function greet(name) {');
          break;

        case 'json': {
          // Validate it's valid JSON
          const jsonOutput = JSON.parse(actualOutput);
          expect(jsonOutput.fileSummary).toBeDefined();
          expect(jsonOutput.userProvidedHeader).toBeDefined();
          expect(jsonOutput.directoryStructure).toBeDefined();
          expect(jsonOutput.files).toBeDefined();
          expect(jsonOutput.files['src/index.js']).toContain('function main() {');
          expect(jsonOutput.files['src/utils.js']).toContain('function greet(name) {');
          break;
        }

        default:
          throw new Error(`Unsupported style: ${config.output?.style}`);
      }

      // Optionally, update the expected output if explicitly requested
      if (process.env.UPDATE_EXPECTED_OUTPUT) {
        await fs.writeFile(expectedOutputPath, actualOutput);
        console.log(`Updated expected output for ${desc}`);
      }
    });
  }
});
