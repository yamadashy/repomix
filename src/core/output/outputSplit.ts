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
  // Use indexOf to find the first separator instead of replaceAll + split.
  // Avoids creating intermediate strings for the common case (posix paths).
  const posixIdx = relativeFilePath.indexOf('/');
  const win32Idx = relativeFilePath.indexOf('\\');
  // Pick the earliest separator (or -1 if none)
  const sepIdx = posixIdx >= 0 && win32Idx >= 0 ? Math.min(posixIdx, win32Idx) : Math.max(posixIdx, win32Idx);
  return sepIdx > 0 ? relativeFilePath.slice(0, sepIdx) : relativeFilePath;
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

  return Array.from(groupsByRootEntry.values()).sort((a, b) => {
    const aLower = a.rootEntry.toLowerCase();
    const bLower = b.rootEntry.toLowerCase();
    return aLower < bLower ? -1 : aLower > bLower ? 1 : 0;
  });
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
  let currentGroups: OutputSplitGroup[] = [];
  let currentContent = '';
  let currentBytes = 0;

  // Pre-compute each group's file content byte size in a single pass.
  // Used for fast size estimation to skip expensive full renders.
  const groupContentBytes = groups.map((g) =>
    g.processedFiles.reduce((sum, f) => sum + getUtf8ByteLength(f.content), 0),
  );

  // Optimized split algorithm: measures the "overhead" (headers, tree, formatting)
  // from the first full render, then uses overhead + accumulated content bytes as
  // a fast estimate for subsequent groups. Full renders are only performed when
  // the estimate approaches the boundary (within 80% of the limit), reducing
  // total renders from O(N²) to ~O(N) for typical repositories.
  //
  // The overhead grows sub-linearly with group count (tree structure adds a few bytes
  // per file), so we apply a 1.5x safety multiplier on the content portion to account
  // for tree growth, path entries in file summary, and template formatting.
  let measuredOverhead = 0;
  let overheadMeasured = false;
  let accumulatedContentBytes = 0;
  let needsRender = false;
  const CONTENT_INFLATION = 1.5;
  const ESTIMATE_THRESHOLD = 0.8;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const partIndex = parts.length + 1;
    const groupBytes = groupContentBytes[i];
    progressCallback(`Generating output... (part ${partIndex}) ${pc.dim(`evaluating ${group.rootEntry}`)}`);

    // Fast path: if we've measured overhead and the estimate is clearly under the limit,
    // skip the expensive full render. We never finalize a part without a full render.
    if (overheadMeasured) {
      const estimatedBytes = measuredOverhead + (accumulatedContentBytes + groupBytes) * CONTENT_INFLATION;
      if (estimatedBytes < maxBytesPerPart * ESTIMATE_THRESHOLD) {
        currentGroups.push(group);
        accumulatedContentBytes += groupBytes;
        needsRender = true;
        continue;
      }
    }

    // Near the boundary (or first iteration): do a full render for accuracy
    const nextGroups = [...currentGroups, group];
    const nextContent = await renderGroups(
      nextGroups,
      partIndex,
      rootDirs,
      baseConfig,
      gitDiffResult,
      gitLogResult,
      filePathsByRoot,
      emptyDirPaths,
      deps.generateOutput,
    );
    const nextBytes = getUtf8ByteLength(nextContent);

    // Calibrate overhead from the first render in each part
    if (!overheadMeasured) {
      const totalContentBytes = accumulatedContentBytes + groupBytes;
      measuredOverhead = nextBytes - totalContentBytes;
      overheadMeasured = true;
    }

    if (nextBytes <= maxBytesPerPart) {
      currentGroups = nextGroups;
      currentContent = nextContent;
      currentBytes = nextBytes;
      accumulatedContentBytes += groupBytes;
      needsRender = false;
      continue;
    }

    // Over the limit. Finalize the current part.
    if (currentGroups.length === 0) {
      throw new RepomixError(
        `Cannot split output: root entry '${group.rootEntry}' exceeds max size. ` +
          `Part size ${nextBytes.toLocaleString()} bytes > limit ${maxBytesPerPart.toLocaleString()} bytes.`,
      );
    }

    // If we skipped renders, we need to render the current groups (without the new group)
    // to get the actual content for the finalized part.
    if (needsRender) {
      currentContent = await renderGroups(
        currentGroups,
        partIndex,
        rootDirs,
        baseConfig,
        gitDiffResult,
        gitLogResult,
        filePathsByRoot,
        emptyDirPaths,
        deps.generateOutput,
      );
      currentBytes = getUtf8ByteLength(currentContent);
    }

    parts.push({
      index: partIndex,
      filePath: buildSplitOutputFilePath(baseConfig.output.filePath, partIndex),
      content: currentContent,
      byteLength: currentBytes,
      groups: currentGroups,
    });

    const newPartIndex = parts.length + 1;
    progressCallback(`Generating output... (part ${newPartIndex}) ${pc.dim(`evaluating ${group.rootEntry}`)}`);
    const singleGroupContent = await renderGroups(
      [group],
      newPartIndex,
      rootDirs,
      baseConfig,
      gitDiffResult,
      gitLogResult,
      filePathsByRoot,
      emptyDirPaths,
      deps.generateOutput,
    );
    const singleGroupBytes = getUtf8ByteLength(singleGroupContent);
    if (singleGroupBytes > maxBytesPerPart) {
      throw new RepomixError(
        `Cannot split output: root entry '${group.rootEntry}' exceeds max size. ` +
          `Part size ${singleGroupBytes.toLocaleString()} bytes > limit ${maxBytesPerPart.toLocaleString()} bytes.`,
      );
    }

    currentGroups = [group];
    currentContent = singleGroupContent;
    currentBytes = singleGroupBytes;
    // Reset overhead measurement for new part (different part index = different overhead)
    accumulatedContentBytes = groupBytes;
    measuredOverhead = singleGroupBytes - groupBytes;
    needsRender = false;
  }

  // Finalize the last part
  if (currentGroups.length > 0) {
    const finalIndex = parts.length + 1;

    // If we skipped renders for the last batch, render now to get actual content
    if (needsRender) {
      currentContent = await renderGroups(
        currentGroups,
        finalIndex,
        rootDirs,
        baseConfig,
        gitDiffResult,
        gitLogResult,
        filePathsByRoot,
        emptyDirPaths,
        deps.generateOutput,
      );
      currentBytes = getUtf8ByteLength(currentContent);
    }

    parts.push({
      index: finalIndex,
      filePath: buildSplitOutputFilePath(baseConfig.output.filePath, finalIndex),
      content: currentContent,
      byteLength: currentBytes,
      groups: currentGroups,
    });
  }

  return parts;
};
