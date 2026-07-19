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

// Returns the first `depth` path segments joined with '/'. Used to key a group at a
// deeper directory level than its current one when a single group is too large to fit.
const getPathPrefix = (relativeFilePath: string, depth: number): string => {
  const normalized = relativeFilePath.replaceAll(path.win32.sep, path.posix.sep);
  return normalized.split('/').slice(0, depth).join('/');
};

// Re-partition an oversized group one directory level deeper. A group keyed by 'src'
// becomes groups keyed by 'src/a', 'src/b', 'src/file.ts', and so on. Returns null when
// the group can no longer be divided (a single file, which cannot be split across parts).
export const subdivideSplitGroup = (group: OutputSplitGroup): OutputSplitGroup[] | null => {
  const childDepth = group.rootEntry.split('/').length + 1;
  const childrenByKey = new Map<string, OutputSplitGroup>();

  for (const processedFile of group.processedFiles) {
    const key = getPathPrefix(processedFile.path, childDepth);
    const existing = childrenByKey.get(key);
    if (existing) {
      existing.processedFiles.push(processedFile);
    } else {
      childrenByKey.set(key, { rootEntry: key, processedFiles: [processedFile], allFilePaths: [] });
    }
  }

  for (const filePath of group.allFilePaths) {
    const key = getPathPrefix(filePath, childDepth);
    const existing = childrenByKey.get(key);
    if (existing) {
      existing.allFilePaths.push(filePath);
    } else {
      childrenByKey.set(key, { rootEntry: key, processedFiles: [], allFilePaths: [filePath] });
    }
  }

  const children = [...childrenByKey.values()].sort((a, b) => a.rootEntry.localeCompare(b.rootEntry));

  // No progress: every path already resolves to the group's own key (a single file), so
  // there is nothing finer to split into.
  if (children.length === 1 && children[0].rootEntry === group.rootEntry) {
    return null;
  }
  return children;
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
  let currentGroups: OutputSplitGroup[] = [];
  let currentContent = '';
  let currentBytes = 0;

  // Groups are processed via a queue so an oversized group can be replaced in place by its
  // finer-grained subdivisions (see below) and re-evaluated without special-casing the loop.
  const queue: OutputSplitGroup[] = [...groups];

  const finalizeCurrentPart = () => {
    parts.push({
      index: parts.length + 1,
      filePath: buildSplitOutputFilePath(baseConfig.output.filePath, parts.length + 1),
      content: currentContent,
      byteLength: currentBytes,
      groups: currentGroups,
    });
    currentGroups = [];
    currentContent = '';
    currentBytes = 0;
  };

  // Note: Measuring each part exactly means rendering all groups accumulated so far, giving a
  // base cost of O(N²) in the number of groups N. N is not fixed: a group that cannot fit even
  // on its own is subdivided one directory level deeper and re-queued (see below), so on
  // pathological inputs (e.g. a single huge top-level directory) N — and the number of renders —
  // grows until each part fits, bottoming out at individual files. This exact-render approach is
  // intentional because:
  // 1. The final output size cannot be predicted by simple addition - the output includes
  //    a file tree structure and template formatting (XML/Markdown) that vary non-linearly.
  // 2. Headers, footers, and file tree size change based on the combination of groups.
  // 3. For typical repositories with ~10-20 top-level directories, this is acceptable.
  // If performance becomes an issue, consider caching each group's standalone render size (their
  // sum is an upper bound on the combined size, since shared tree structure and fixed overhead
  // are only counted once when combined) to skip the exact render when a part clearly fits, and
  // fall back to an exact render only near the limit so correctness is preserved.
  while (queue.length > 0) {
    const group = queue.shift() as OutputSplitGroup;
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
      emptyDirPaths,
      deps.generateOutput,
    );
    const nextBytes = getUtf8ByteLength(nextContent);

    if (nextBytes <= maxBytesPerPart) {
      currentGroups = nextGroups;
      currentContent = nextContent;
      currentBytes = nextBytes;
      continue;
    }

    // The group does not fit alongside what is already accumulated: flush the current part
    // and retry this group on a fresh part.
    if (currentGroups.length > 0) {
      finalizeCurrentPart();
      queue.unshift(group);
      continue;
    }

    // The group does not fit even on its own. Split it one directory level deeper and retry
    // the finer-grained groups. Only a single file cannot be divided further.
    const subGroups = subdivideSplitGroup(group);
    if (subGroups) {
      queue.unshift(...subGroups);
      continue;
    }

    throw new RepomixError(
      `Cannot split output: '${group.rootEntry}' exceeds max size on its own. ` +
        `Size ${nextBytes.toLocaleString()} bytes > limit ${maxBytesPerPart.toLocaleString()} bytes. ` +
        'A single file cannot be split across parts.',
    );
  }

  if (currentGroups.length > 0) {
    finalizeCurrentPart();
  }

  return parts;
};
