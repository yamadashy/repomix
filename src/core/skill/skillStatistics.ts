import path from 'node:path';
import type { ProcessedFile } from '../file/fileTypes.js';

interface FileTypeStats {
  extension: string;
  language: string;
  fileCount: number;
  lineCount: number;
}

interface StatisticsInfo {
  totalFiles: number;
  totalLines: number;
  byFileType: FileTypeStats[];
  largestFiles: Array<{ path: string; lines: number }>;
}

// Map extensions to language names
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (JSX)',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (TSX)',
  '.mjs': 'JavaScript (ESM)',
  '.cjs': 'JavaScript (CJS)',

  // Web
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.vue': 'Vue',
  '.svelte': 'Svelte',

  // Data/Config
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'TOML',
  '.xml': 'XML',
  '.ini': 'INI',
  '.env': 'Environment',

  // Documentation
  '.md': 'Markdown',
  '.mdx': 'MDX',
  '.rst': 'reStructuredText',
  '.txt': 'Text',

  // Backend
  '.py': 'Python',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin Script',
  '.scala': 'Scala',
  '.go': 'Go',
  '.rs': 'Rust',
  '.c': 'C',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.cs': 'C#',
  '.swift': 'Swift',
  '.m': 'Objective-C',
  '.mm': 'Objective-C++',

  // Shell/Scripts
  '.sh': 'Shell',
  '.bash': 'Bash',
  '.zsh': 'Zsh',
  '.fish': 'Fish',
  '.ps1': 'PowerShell',
  '.bat': 'Batch',
  '.cmd': 'Batch',

  // Other
  '.sql': 'SQL',
  '.graphql': 'GraphQL',
  '.gql': 'GraphQL',
  '.proto': 'Protocol Buffers',
  '.dockerfile': 'Dockerfile',
  '.lua': 'Lua',
  '.r': 'R',
  '.ex': 'Elixir',
  '.exs': 'Elixir Script',
  '.erl': 'Erlang',
  '.clj': 'Clojure',
  '.hs': 'Haskell',
  '.ml': 'OCaml',
  '.nim': 'Nim',
  '.zig': 'Zig',
  '.dart': 'Dart',
  '.v': 'V',
  '.sol': 'Solidity',
};

/**
 * Gets language name from file extension.
 */
const getLanguageFromExtension = (ext: string): string => {
  return EXTENSION_TO_LANGUAGE[ext.toLowerCase()] || ext.slice(1).toUpperCase() || 'Unknown';
};

/**
 * Sift-down operation for a min-heap sorted by `lines`.
 * O(log k) per call where k is heap size, vs O(k log k) for full re-sort.
 */
const siftDown = (heap: Array<{ path: string; lines: number }>, i: number): void => {
  const n = heap.length;
  while (true) {
    let smallest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < n && heap[left].lines < heap[smallest].lines) smallest = left;
    if (right < n && heap[right].lines < heap[smallest].lines) smallest = right;
    if (smallest === i) break;
    const tmp = heap[i];
    heap[i] = heap[smallest];
    heap[smallest] = tmp;
    i = smallest;
  }
};

/**
 * Calculates statistics from processed files.
 */
export const calculateStatistics = (
  processedFiles: ProcessedFile[],
  fileLineCounts: Record<string, number>,
): StatisticsInfo => {
  const statsByExt: Record<string, { fileCount: number; lineCount: number }> = {};
  let totalLines = 0;

  // Calculate stats by extension and track line counts in a single pass
  // to avoid splitting file content twice
  const fileLinesMap: Record<string, number> = {};
  for (const file of processedFiles) {
    const ext = path.extname(file.path).toLowerCase() || '(no ext)';
    const lines = fileLineCounts[file.path] || file.content.split('\n').length;
    fileLinesMap[file.path] = lines;

    if (!statsByExt[ext]) {
      statsByExt[ext] = { fileCount: 0, lineCount: 0 };
    }
    statsByExt[ext].fileCount++;
    statsByExt[ext].lineCount += lines;
    totalLines += lines;
  }

  // Convert to array and sort by file count
  const byFileType: FileTypeStats[] = Object.entries(statsByExt)
    .map(([ext, stats]) => ({
      extension: ext,
      language: ext === '(no ext)' ? 'No Extension' : getLanguageFromExtension(ext),
      fileCount: stats.fileCount,
      lineCount: stats.lineCount,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  // Get largest files (top 10) using partial sort (min-heap) instead of full sort.
  // For 1000 files, this avoids sorting 990 irrelevant files.
  const TOP_K = 10;
  let largestFiles: Array<{ path: string; lines: number }>;
  if (processedFiles.length <= TOP_K) {
    largestFiles = processedFiles
      .map((file) => ({ path: file.path, lines: fileLinesMap[file.path] }))
      .sort((a, b) => b.lines - a.lines);
  } else {
    // Min-heap of size TOP_K
    const heap = processedFiles.slice(0, TOP_K).map((file) => ({ path: file.path, lines: fileLinesMap[file.path] }));
    heap.sort((a, b) => a.lines - b.lines);
    for (let i = TOP_K; i < processedFiles.length; i++) {
      const lines = fileLinesMap[processedFiles[i].path];
      if (lines > heap[0].lines) {
        heap[0] = { path: processedFiles[i].path, lines };
        // Sift down to restore min-heap property
        siftDown(heap, 0);
      }
    }
    largestFiles = heap.sort((a, b) => b.lines - a.lines);
  }

  return {
    totalFiles: processedFiles.length,
    totalLines,
    byFileType,
    largestFiles,
  };
};

/**
 * Generates statistics markdown table for SKILL.md.
 */
export const generateStatisticsSection = (stats: StatisticsInfo): string => {
  const lines: string[] = ['## Statistics', ''];

  // Summary line
  lines.push(`${stats.totalFiles} files | ${stats.totalLines.toLocaleString()} lines`);
  lines.push('');

  // File type table (top 10)
  lines.push('| Language | Files | Lines |');
  lines.push('|----------|------:|------:|');

  const topTypes = stats.byFileType.slice(0, 10);
  for (const type of topTypes) {
    lines.push(`| ${type.language} | ${type.fileCount} | ${type.lineCount.toLocaleString()} |`);
  }

  if (stats.byFileType.length > 10) {
    let otherFiles = 0;
    let otherLines = 0;
    for (let i = 10; i < stats.byFileType.length; i++) {
      otherFiles += stats.byFileType[i].fileCount;
      otherLines += stats.byFileType[i].lineCount;
    }
    lines.push(`| Other | ${otherFiles} | ${otherLines.toLocaleString()} |`);
  }

  lines.push('');

  // Largest files
  if (stats.largestFiles.length > 0) {
    lines.push('**Largest files:**');
    for (const file of stats.largestFiles) {
      lines.push(`- \`${file.path}\` (${file.lines.toLocaleString()} lines)`);
    }
  }

  return lines.join('\n');
};
