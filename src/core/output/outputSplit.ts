import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';

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

export const generateSplitOutputParts = async ({
  rootDirs,
  baseConfig,
  processedFiles,
  allFilePaths,
  maxBytesPerPart,
  gitDiffResult,
  gitLogResult,
  progressCallback,
  deps,
}: {
  rootDirs: string[];
  baseConfig: RepomixConfigMerged;
  processedFiles: ProcessedFile[];
  allFilePaths: string[];
  maxBytesPerPart: number;
  gitDiffResult: GitDiffResult | undefined;
  gitLogResult: GitLogResult | undefined;
  progressCallback: (message: string) => void;
  deps: {
    generateOutput: (
      rootDirsArg: string[],
      configArg: RepomixConfigMerged,
      processedFilesArg: ProcessedFile[],
      allFilePathsArg: string[],
      gitDiffArg: GitDiffResult | undefined,
      gitLogArg: GitLogResult | undefined,
    ) => Promise<string>;
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

  const makeChunkConfig = (partIndex: number) => {
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

  const renderGroups = async (groupsToRender: OutputSplitGroup[], partIndex: number): Promise<string> => {
    const chunkProcessedFiles = groupsToRender.flatMap((g) => g.processedFiles);
    const chunkAllFilePaths = groupsToRender.flatMap((g) => g.allFilePaths);
    const chunkConfig = makeChunkConfig(partIndex);

    progressCallback(`Generating output (part ${partIndex})...`);
    return await deps.generateOutput(
      rootDirs,
      chunkConfig,
      chunkProcessedFiles,
      chunkAllFilePaths,
      partIndex === 1 ? gitDiffResult : undefined,
      partIndex === 1 ? gitLogResult : undefined,
    );
  };

  for (const group of groups) {
    const partIndex = parts.length + 1;
    const nextGroups = [...currentGroups, group];
    const nextContent = await renderGroups(nextGroups, partIndex);
    const nextBytes = getUtf8ByteLength(nextContent);

    if (nextBytes <= maxBytesPerPart) {
      currentGroups = nextGroups;
      currentContent = nextContent;
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
      byteLength: getUtf8ByteLength(currentContent),
      groups: currentGroups,
    });

    const newPartIndex = parts.length + 1;
    const singleGroupContent = await renderGroups([group], newPartIndex);
    const singleGroupBytes = getUtf8ByteLength(singleGroupContent);
    if (singleGroupBytes > maxBytesPerPart) {
      throw new RepomixError(
        `Cannot split output: root entry '${group.rootEntry}' exceeds max size. ` +
          `Part size ${singleGroupBytes.toLocaleString()} bytes > limit ${maxBytesPerPart.toLocaleString()} bytes.`,
      );
    }

    currentGroups = [group];
    currentContent = singleGroupContent;
  }

  if (currentGroups.length > 0) {
    const finalIndex = parts.length + 1;
    parts.push({
      index: finalIndex,
      filePath: buildSplitOutputFilePath(baseConfig.output.filePath, finalIndex),
      content: currentContent,
      byteLength: getUtf8ByteLength(currentContent),
      groups: currentGroups,
    });
  }

  return parts;
};
