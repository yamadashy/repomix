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
 * Calculates statistics from processed files.
 */
export const calculateStatistics = (
  processedFiles: ProcessedFile[],
  fileLineCounts: Record<string, number>,
): StatisticsInfo => {
  const statsByExt: Record<string, { fileCount: number; lineCount: number }> = {};
  let totalLines = 0;

  // Calculate stats by extension
  for (const file of processedFiles) {
    const ext = path.extname(file.path).toLowerCase() || '(no ext)';
    const lines = fileLineCounts[file.path] || file.content.split('\n').length;

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

  // Get largest files (top 10)
  const largestFiles = processedFiles
    .map((file) => ({
      path: file.path,
      lines: fileLineCounts[file.path] || file.content.split('\n').length,
    }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10);

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
    const otherFiles = stats.byFileType.slice(10).reduce((sum, t) => sum + t.fileCount, 0);
    const otherLines = stats.byFileType.slice(10).reduce((sum, t) => sum + t.lineCount, 0);
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
