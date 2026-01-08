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

  // Note: This algorithm has O(N²) complexity where N is the number of groups.
  // For each group, we render all accumulated groups to measure the exact output size.
  // This approach is intentional because:
  // 1. The final output size cannot be predicted by simple addition - the output includes
  //    a file tree structure and template formatting (XML/Markdown) that vary non-linearly.
  // 2. Headers, footers, and file tree size change based on the combination of groups.
  // 3. For typical repositories with ~10-20 top-level directories, this is acceptable.
  // If performance becomes an issue, consider caching individual group content sizes
  // and estimating combined sizes with a safety margin.
  for (const group of groups) {
    const partIndex = parts.length + 1;
    const nextGroups = [...currentGroups, group];
    progressCallback(`Generating output... (part ${partIndex}) ${pc.dim(`evaluating ${group.rootEntry}`)}`);
    const nextContent = await renderGroups(
      nextGroups,
      partIndex,
      rootDirs,
      baseConfig,
      gitDiffResult,
      gitLogResult,
      filePathsByRoot,
      deps.generateOutput,
    );
    const nextBytes = getUtf8ByteLength(nextContent);

    if (nextBytes <= maxBytesPerPart) {
      currentGroups = nextGroups;
      currentContent = nextContent;
      currentBytes = nextBytes;
      continue;
    }

    if (currentGroups.length === 0) {
      throw new RepomixError(
        `Cannot split output: root entry '${group.rootEntry}' exceeds max size. ` +
          `Part size ${nextBytes.toLocaleString()} bytes > limit ${maxBytesPerPart.toLocaleString()} bytes.`,
      );
    }

    // Finalize current part and start a new one with the current group.
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
  }

  if (currentGroups.length > 0) {
    const finalIndex = parts.length + 1;
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
