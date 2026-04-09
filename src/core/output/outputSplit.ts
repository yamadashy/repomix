import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { FilesByRoot } from '../file/fileTreeGenerate.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { generateOutput } from './outputGenerate.js';

export interface OutputSplitGroup {
  rootEntry: string;
  processedFiles: ProcessedFile[];
  allFilePaths: string[];
}

export interface OutputSplitPart {
  index: number;
  filePath: string;
  content: string;
  byteLength: number;
  groups: OutputSplitGroup[];
}

export type GenerateOutputFn = typeof generateOutput;

export const getRootEntry = (relativeFilePath: string): string => {
  const normalized = relativeFilePath.replaceAll(path.win32.sep, path.posix.sep);
  const [first] = normalized.split('/');
  return first || normalized;
};

export const buildOutputSplitGroups = (processedFiles: ProcessedFile[], allFilePaths: string[]): OutputSplitGroup[] => {
  const groupsByRootEntry = new Map<string, OutputSplitGroup>();

  for (const filePath of allFilePaths) {
    const rootEntry = getRootEntry(filePath);
    const existing = groupsByRootEntry.get(rootEntry);
    if (existing) {
      existing.allFilePaths.push(filePath);
    } else {
      groupsByRootEntry.set(rootEntry, { rootEntry, processedFiles: [], allFilePaths: [filePath] });
    }
  }

  for (const processedFile of processedFiles) {
    const rootEntry = getRootEntry(processedFile.path);
    const existing = groupsByRootEntry.get(rootEntry);
    if (existing) {
      existing.processedFiles.push(processedFile);
    } else {
      groupsByRootEntry.set(rootEntry, {
        rootEntry,
        processedFiles: [processedFile],
        allFilePaths: [processedFile.path],
      });
    }
  }

  return [...groupsByRootEntry.values()].sort((a, b) => a.rootEntry.localeCompare(b.rootEntry));
};

export const buildSplitOutputFilePath = (baseFilePath: string, partIndex: number): string => {
  const ext = path.extname(baseFilePath);
  if (!ext) {
    return `${baseFilePath}.${partIndex}`;
  }
  const baseWithoutExt = baseFilePath.slice(0, -ext.length);
  return `${baseWithoutExt}.${partIndex}${ext}`;
};

const getUtf8ByteLength = (content: string): number => Buffer.byteLength(content, 'utf8');

const makeChunkConfig = (baseConfig: RepomixConfigMerged, partIndex: number): RepomixConfigMerged => {
  if (partIndex === 1) {
    return baseConfig;
  }

  // For non-first chunks, disable git diffs/logs to avoid repeating large sections.
  const git = {
    ...baseConfig.output.git,
    includeDiffs: false,
    includeLogs: false,
  };

  return {
    ...baseConfig,
    output: {
      ...baseConfig.output,
      git,
    },
  };
};

const renderGroups = async (
  groupsToRender: OutputSplitGroup[],
  partIndex: number,
  rootDirs: string[],
  baseConfig: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  filePathsByRoot: FilesByRoot[] | undefined,
  emptyDirPaths: string[] | undefined,
  generateOutput: GenerateOutputFn,
): Promise<string> => {
  const chunkProcessedFiles = groupsToRender.flatMap((g) => g.processedFiles);
  const chunkAllFilePaths = groupsToRender.flatMap((g) => g.allFilePaths);
  const chunkConfig = makeChunkConfig(baseConfig, partIndex);

  return generateOutput(
    rootDirs,
    chunkConfig,
    chunkProcessedFiles,
    chunkAllFilePaths,
    partIndex === 1 ? gitDiffResult : undefined,
    partIndex === 1 ? gitLogResult : undefined,
    filePathsByRoot,
    emptyDirPaths,
  );
};

export const generateSplitOutputParts = async ({
  rootDirs,
  baseConfig,
  processedFiles,
  allFilePaths,
  maxBytesPerPart,
  gitDiffResult,
  gitLogResult,
  progressCallback,
  filePathsByRoot,
  emptyDirPaths,
  deps,
}: {
  rootDirs: string[];
  baseConfig: RepomixConfigMerged;
  processedFiles: ProcessedFile[];
  allFilePaths: string[];
  maxBytesPerPart: number;
  gitDiffResult: GitDiffResult | undefined;
  gitLogResult: GitLogResult | undefined;
  progressCallback: RepomixProgressCallback;
  filePathsByRoot?: FilesByRoot[];
  emptyDirPaths?: string[];
  deps: {
    generateOutput: GenerateOutputFn;
  };
}): Promise<OutputSplitPart[]> => {
  if (!Number.isSafeInteger(maxBytesPerPart) || maxBytesPerPart <= 0) {
    throw new RepomixError(`Invalid maxBytesPerPart: ${maxBytesPerPart}`);
  }

  const groups = buildOutputSplitGroups(processedFiles, allFilePaths);
  if (groups.length === 0) {
    return [];
  }

  // ── Phase 1: Solo-render each group to measure per-group sizes ──
  // Each group is rendered in isolation as a non-first part (partIndex=2, no git sections)
  // so that per-group content cost is measured independently of git overhead.
  // This is O(N) renders, each processing only one group's files.
  const soloBytes: number[] = new Array(groups.length);
  for (let i = 0; i < groups.length; i++) {
    progressCallback(`Generating output... ${pc.dim(`measuring ${groups[i].rootEntry}`)}`);
    const content = await renderGroups(
      [groups[i]],
      2,
      rootDirs,
      baseConfig,
      gitDiffResult,
      gitLogResult,
      filePathsByRoot,
      emptyDirPaths,
      deps.generateOutput,
    );
    soloBytes[i] = getUtf8ByteLength(content);
  }

  // ── Phase 2: Calibrate overhead values for accurate size estimation ──
  // Git overhead: the byte cost of git diff/log sections included only in part 1.
  const soloWithGitContent = await renderGroups(
    [groups[0]],
    1,
    rootDirs,
    baseConfig,
    gitDiffResult,
    gitLogResult,
    filePathsByRoot,
    emptyDirPaths,
    deps.generateOutput,
  );
  const gitOverhead = getUtf8ByteLength(soloWithGitContent) - soloBytes[0];

  // Shared overhead: the fixed cost (header, footer, tree-base) that each solo render
  // includes once but a combined render deduplicates. Since groups have non-overlapping
  // root entries (by construction), the file tree is approximately additive across groups,
  // so this overhead is predominantly header + footer. Computed from the first two groups.
  // Clamped to 0 for safety; if negative (format adds inter-group cost), Phase 4
  // verification renders will catch any resulting estimation inaccuracy.
  let sharedOverhead = 0;
  if (groups.length >= 2) {
    const combinedContent = await renderGroups(
      [groups[0], groups[1]],
      2,
      rootDirs,
      baseConfig,
      gitDiffResult,
      gitLogResult,
      filePathsByRoot,
      emptyDirPaths,
      deps.generateOutput,
    );
    sharedOverhead = Math.max(0, soloBytes[0] + soloBytes[1] - getUtf8ByteLength(combinedContent));
  }

  // ── Phase 3: Greedy bin-packing using estimated combined sizes ──
  // Estimate: first group in part = soloBytes[i] + gitOverhead (part 1 only)
  //           each additional group = + soloBytes[j] - sharedOverhead
  // This is exact when the tree contribution is additive (non-overlapping root entries).
  const partGroupIndices: number[][] = [];
  let currentIndices: number[] = [];
  let currentEstimate = 0;

  for (let i = 0; i < groups.length; i++) {
    const isFirstPart = partGroupIndices.length === 0;
    let nextEstimate: number;

    if (currentIndices.length === 0) {
      nextEstimate = soloBytes[i] + (isFirstPart ? gitOverhead : 0);
    } else {
      nextEstimate = currentEstimate + soloBytes[i] - sharedOverhead;
    }

    if (nextEstimate <= maxBytesPerPart || currentIndices.length === 0) {
      currentIndices.push(i);
      currentEstimate = nextEstimate;
    } else {
      partGroupIndices.push(currentIndices);
      currentIndices = [i];
      currentEstimate = soloBytes[i];
    }
  }
  if (currentIndices.length > 0) {
    partGroupIndices.push(currentIndices);
  }

  // ── Phase 4: Render each part once for exact content, verify against byte limit ──
  const parts: OutputSplitPart[] = [];

  for (let p = 0; p < partGroupIndices.length; p++) {
    const partIndex = p + 1;
    const indices = partGroupIndices[p];
    let partGroups = indices.map((i) => groups[i]);

    progressCallback(
      `Generating output... (part ${partIndex}) ${pc.dim(partGroups.map((g) => g.rootEntry).join(', '))}`,
    );
    let content = await renderGroups(
      partGroups,
      partIndex,
      rootDirs,
      baseConfig,
      gitDiffResult,
      gitLogResult,
      filePathsByRoot,
      emptyDirPaths,
      deps.generateOutput,
    );
    let bytes = getUtf8ByteLength(content);

    // If the rendered part exceeds the limit (estimation was imprecise), iteratively
    // remove the last group and push it to the next part until it fits.
    while (bytes > maxBytesPerPart && partGroups.length > 1) {
      const removedIndex = indices.pop()!;
      partGroups = indices.map((i) => groups[i]);

      if (p + 1 < partGroupIndices.length) {
        partGroupIndices[p + 1].unshift(removedIndex);
      } else {
        partGroupIndices.push([removedIndex]);
      }

      progressCallback(`Generating output... (part ${partIndex}) ${pc.dim('adjusting')}`);
      content = await renderGroups(
        partGroups,
        partIndex,
        rootDirs,
        baseConfig,
        gitDiffResult,
        gitLogResult,
        filePathsByRoot,
        emptyDirPaths,
        deps.generateOutput,
      );
      bytes = getUtf8ByteLength(content);
    }

    if (bytes > maxBytesPerPart) {
      throw new RepomixError(
        `Cannot split output: root entry '${partGroups[0].rootEntry}' exceeds max size. ` +
          `Part size ${bytes.toLocaleString()} bytes > limit ${maxBytesPerPart.toLocaleString()} bytes.`,
      );
    }

    parts.push({
      index: partIndex,
      filePath: buildSplitOutputFilePath(baseConfig.output.filePath, partIndex),
      content,
      byteLength: bytes,
      groups: partGroups,
    });
  }

  return parts;
};
