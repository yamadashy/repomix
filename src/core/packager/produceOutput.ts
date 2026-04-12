import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { withMemoryLogging } from '../../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { FilesByRoot } from '../file/fileTreeGenerate.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { generateOutput as GenerateOutputFn } from '../output/outputGenerate.js';
import { generateSplitOutputParts } from '../output/outputSplit.js';
import { copyToClipboardIfEnabled as copyToClipboardIfEnabledDefault } from './copyToClipboardIfEnabled.js';
import { writeOutputToDisk as writeOutputToDiskDefault } from './writeOutputToDisk.js';

export interface ProduceOutputResult {
  outputFiles?: string[];
  outputForMetrics: string | string[];
  pendingIO?: Promise<void>;
}

const defaultDeps = {
  // Lazy-load outputGenerate to defer importing Handlebars + output style modules
  // (~19ms) from CLI startup to when output generation actually starts. At that
  // point calculateMetrics is already running on worker threads (~500ms), so the
  // import cost is completely hidden behind the parallel metrics phase.
  generateOutput: (async (...args: Parameters<typeof GenerateOutputFn>) => {
    const { generateOutput } = await import('../output/outputGenerate.js');
    return generateOutput(...args);
  }) as typeof GenerateOutputFn,
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

  // Return output content immediately so metrics can start while disk I/O
  // runs in the background. The caller awaits pendingIO after metrics.
  progressCallback('Writing output files...');
  const pendingIO = withMemoryLogging('Write Split Output', async () => {
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

  // Prevent unhandled rejection (see single-output path comment).
  pendingIO.catch(() => {});

  return {
    outputFiles: parts.map((p) => p.filePath),
    outputForMetrics: parts.map((p) => p.content),
    pendingIO,
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

  // Return the output string immediately so calculateMetrics can begin
  // tokenizing while disk I/O runs in the background. The caller awaits
  // pendingIO after metrics complete to ensure the write finishes before
  // pack() returns.
  progressCallback('Writing output file...');
  const pendingIO = withMemoryLogging('Write Output', () => deps.writeOutputToDisk(output, config)).then(() =>
    deps.copyToClipboardIfEnabled(output, progressCallback, config),
  );

  // Prevent unhandled rejection if the caller doesn't reach `await pendingIO`
  // before this promise rejects (e.g., metrics throws first).
  pendingIO.catch(() => {});

  return {
    outputForMetrics: output,
    pendingIO,
  };
};
