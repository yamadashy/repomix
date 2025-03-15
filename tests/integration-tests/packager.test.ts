import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import type { RepomixConfigFile, RepomixConfigMerged, RepomixOutputStyle } from '../../src/config/configSchema.js';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import type { ProcessedFile } from '../../src/core/file/fileTypes.js';
import type { FileCollectTask } from '../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../src/core/file/workers/fileCollectWorker.js';
import fileProcessWorker from '../../src/core/file/workers/fileProcessWorker.js';
import { generateOutput } from '../../src/core/output/outputGenerate.js';
import { pack } from '../../src/core/packager.js';
import { copyToClipboardIfEnabled } from '../../src/core/packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from '../../src/core/packager/writeOutputToDisk.js';
import { filterOutUntrustedFiles } from '../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../src/core/security/validateFileSafety.js';
import { isWindows } from '../testing/testUtils.js';

const fixturesDir = path.join(__dirname, 'fixtures', 'packager');
const inputsDir = path.join(fixturesDir, 'inputs');
const outputsDir = path.join(fixturesDir, 'outputs');

const mockCollectFileInitTaskRunner = () => {
  return async (task: FileCollectTask) => {
    return await fileCollectWorker(task);
  };
};

describe.runIf(!isWindows)('packager integration', () => {
  const testCases = [
    {
      desc: 'simple plain style',
      input: 'simple-project',
      output: 'simple-project-output.txt',
      config: {},
    },
    {
      desc: 'simple xml style',
      input: 'simple-project',
      output: 'simple-project-output.xml',
      config: {
        output: { style: 'xml', filePath: 'simple-project-output.xml' },
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
        collectFiles: (filePaths, rootDir, progressCallback) => {
          return collectFiles(filePaths, rootDir, progressCallback, {
            initTaskRunner: mockCollectFileInitTaskRunner,
          });
        },
        processFiles: async (rawFiles, config, progressCallback) => {
          const processedFiles: ProcessedFile[] = [];
          for (const rawFile of rawFiles) {
            processedFiles.push(await fileProcessWorker({ rawFile, config }));
          }
          return processedFiles;
        },
        generateOutput,
        validateFileSafety: (rawFiles, progressCallback, config) => {
          return validateFileSafety(rawFiles, progressCallback, config, {
            runSecurityCheck: async () => [],
            filterOutUntrustedFiles,
          });
        },
        writeOutputToDisk,
        copyToClipboardIfEnabled,
        calculateMetrics: async (processedFiles, output, progressCallback, config) => {
          return {
            totalFiles: processedFiles.length,
            totalCharacters: processedFiles.reduce((acc, file) => acc + file.content.length, 0),
            totalTokens: processedFiles.reduce((acc, file) => acc + file.content.split(/\s+/).length, 0),
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
          };
        },
      });

      // Read the actual and expected outputs
      const actualOutput = await fs.readFile(actualOutputPath, 'utf-8');
      const expectedOutput = await fs.readFile(expectedOutputPath, 'utf-8');

      // Compare the outputs
      expect(actualOutput).toBe(expectedOutput);

      // Optionally, update the expected output if explicitly requested
      if (process.env.UPDATE_EXPECTED_OUTPUT) {
        await fs.writeFile(expectedOutputPath, actualOutput);
        console.log(`Updated expected output for ${desc}`);
      }
    });
  }
});
