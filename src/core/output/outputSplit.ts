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

  return await generateOutput(
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

  const parts: OutputSplitPart[] = [];
  let startIdx = 0;

  // Use exponential probing + binary search to find the maximum number of groups
  // that fit in each part. This reduces renderGroups calls from O(N²) (the previous
  // linear scan re-rendered all accumulated groups for every new addition) to
  // O(P·log(N/P)) where P is the number of parts and N is the number of groups.
  while (startIdx < groups.length) {
    const partIndex = parts.length + 1;

    // Bind invariant arguments so each call-site only varies groupsToRender.
    const render = (groupsToRender: OutputSplitGroup[]) =>
      renderGroups(
        groupsToRender,
        partIndex,
        rootDirs,
        baseConfig,
        gitDiffResult,
        gitLogResult,
        filePathsByRoot,
        emptyDirPaths,
        deps.generateOutput,
      );

    // Render the first group of this part to verify it fits on its own.
    progressCallback(`Generating output... (part ${partIndex}) ${pc.dim(`evaluating ${groups[startIdx].rootEntry}`)}`);
    const initialContent = await render([groups[startIdx]]);
    const initialBytes = getUtf8ByteLength(initialContent);

    if (initialBytes > maxBytesPerPart) {
      throw new RepomixError(
        `Cannot split output: root entry '${groups[startIdx].rootEntry}' exceeds max size. ` +
          `Part size ${initialBytes.toLocaleString()} bytes > limit ${maxBytesPerPart.toLocaleString()} bytes.`,
      );
    }

    let bestEnd = startIdx;
    let bestContent = initialContent;
    let bestBytes = initialBytes;

    if (startIdx < groups.length - 1) {
      // Phase 1: Exponential probing — double the probe distance each step
      // to find an upper bound where the output exceeds the byte limit.
      let firstOverflowIdx = groups.length; // index of first probe that overflowed (or sentinel)
      let probeDistance = 1;

      while (startIdx + probeDistance < groups.length) {
        const probeEnd = Math.min(startIdx + probeDistance, groups.length - 1);
        const probeGroups = groups.slice(startIdx, probeEnd + 1);
        progressCallback(
          `Generating output... (part ${partIndex}) ${pc.dim(`evaluating ${probeGroups.length} groups`)}`,
        );
        const probeContent = await render(probeGroups);
        const probeBytes = getUtf8ByteLength(probeContent);

        if (probeBytes <= maxBytesPerPart) {
          bestEnd = probeEnd;
          bestContent = probeContent;
          bestBytes = probeBytes;
          if (probeEnd === groups.length - 1) break;
          probeDistance *= 2;
        } else {
          firstOverflowIdx = probeEnd;
          break;
        }
      }

      // Phase 2: Binary search between bestEnd+1 and firstOverflowIdx-1
      // to find the exact maximum number of groups that fit.
      let lo = bestEnd + 1;
      let hi = firstOverflowIdx - 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midGroups = groups.slice(startIdx, mid + 1);
        progressCallback(`Generating output... (part ${partIndex}) ${pc.dim(`evaluating ${midGroups.length} groups`)}`);
        const midContent = await render(midGroups);
        const midBytes = getUtf8ByteLength(midContent);

        if (midBytes <= maxBytesPerPart) {
          bestEnd = mid;
          bestContent = midContent;
          bestBytes = midBytes;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
    }

    parts.push({
      index: partIndex,
      filePath: buildSplitOutputFilePath(baseConfig.output.filePath, partIndex),
      content: bestContent,
      byteLength: bestBytes,
      groups: groups.slice(startIdx, bestEnd + 1),
    });

    startIdx = bestEnd + 1;
  }

  return parts;
};
