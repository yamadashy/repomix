import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { withMemoryLogging } from '../../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { FilesByRoot } from '../file/fileTreeGenerate.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { generateOutput as generateOutputDefault } from '../output/outputGenerate.js';
import { generateSplitOutputParts } from '../output/outputSplit.js';
import { copyToClipboardIfEnabled as copyToClipboardIfEnabledDefault } from './copyToClipboardIfEnabled.js';
import { writeOutputToDisk as writeOutputToDiskDefault } from './writeOutputToDisk.js';

export interface ProduceOutputResult {
  outputFiles?: string[];
  outputForMetrics: string | string[];
  pendingWrite?: Promise<void>;
}

const defaultDeps = {
  generateOutput: generateOutputDefault,
  writeOutputToDisk: writeOutputToDiskDefault,
  copyToClipboardIfEnabled: copyToClipboardIfEnabledDefault,
};

export const produceOutput = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  progressCallback: RepomixProgressCallback,
  filePathsByRoot?: FilesByRoot[],
  emptyDirPaths?: string[],
  overrideDeps: Partial<typeof defaultDeps> = {},
): Promise<ProduceOutputResult> => {
  const deps = { ...defaultDeps, ...overrideDeps };

  const splitMaxBytes = config.output.splitOutput;

  if (splitMaxBytes !== undefined) {
    return await generateAndWriteSplitOutput(
      rootDirs,
      config,
      processedFiles,
      allFilePaths,
      splitMaxBytes,
      gitDiffResult,
      gitLogResult,
      progressCallback,
      filePathsByRoot,
      emptyDirPaths,
      deps,
    );
  }

  return await generateAndWriteSingleOutput(
    rootDirs,
    config,
    processedFiles,
    allFilePaths,
    gitDiffResult,
    gitLogResult,
    progressCallback,
    filePathsByRoot,
    emptyDirPaths,
    deps,
  );
};

const generateAndWriteSplitOutput = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  splitMaxBytes: number,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  progressCallback: RepomixProgressCallback,
  filePathsByRoot: FilesByRoot[] | undefined,
  emptyDirPaths: string[] | undefined,
  deps: typeof defaultDeps,
): Promise<ProduceOutputResult> => {
  const parts = await withMemoryLogging('Generate Split Output', async () => {
    return await generateSplitOutputParts({
      rootDirs,
      baseConfig: config,
      processedFiles,
      allFilePaths,
      maxBytesPerPart: splitMaxBytes,
      gitDiffResult,
      gitLogResult,
      progressCallback,
      filePathsByRoot,
      emptyDirPaths,
      deps: {
        generateOutput: deps.generateOutput,
      },
    });
  });

  progressCallback('Writing output files...');
  await withMemoryLogging('Write Split Output', async () => {
    await Promise.all(
      parts.map((part) => {
        const partConfig = {
          ...config,
          output: {
            ...config.output,
            stdout: false,
            filePath: part.filePath,
          },
        };
        return deps.writeOutputToDisk(part.content, partConfig);
      }),
    );
  });

  return {
    outputFiles: parts.map((p) => p.filePath),
    outputForMetrics: parts.map((p) => p.content),
  };
};

const generateAndWriteSingleOutput = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  progressCallback: RepomixProgressCallback,
  filePathsByRoot: FilesByRoot[] | undefined,
  emptyDirPaths: string[] | undefined,
  deps: typeof defaultDeps,
): Promise<ProduceOutputResult> => {
  const output = await withMemoryLogging('Generate Output', () =>
    deps.generateOutput(
      rootDirs,
      config,
      processedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      filePathsByRoot,
      emptyDirPaths,
    ),
  );

  // Start disk write and clipboard copy in the background. The output string is
  // already available for metrics tokenization, so there is no need to block on
  // I/O before returning it. The caller awaits `pendingWrite` before exiting.
  progressCallback('Writing output file...');
  const pendingWrite = (async () => {
    await withMemoryLogging('Write Output', () => deps.writeOutputToDisk(output, config));
    await deps.copyToClipboardIfEnabled(output, progressCallback, config);
  })();
  // Suppress unhandledRejection if the write fails before the caller awaits.
  // The caller re-throws by awaiting pendingWrite directly.
  pendingWrite.catch(() => {});

  return {
    outputForMetrics: output,
    pendingWrite,
  };
};
