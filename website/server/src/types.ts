export interface PackOptions {
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  showLineNumbers?: boolean;
  fileSummary?: boolean;
  directoryStructure?: boolean;
  includePatterns?: string;
  ignorePatterns?: string;
  outputParsable?: boolean;
  compress?: boolean;
}

interface TopFile {
  path: string;
  charCount: number;
  tokenCount: number;
}

interface FileInfo {
  path: string;
  tokenCount: number;
  selected?: boolean;
}

interface PackSummary {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
}

export interface SuspiciousFile {
  filePath: string;
  messages: string[];
}

export interface PackResult {
  content: string;
  format: string;
  metadata: {
    repository: string;
    timestamp: string;
    summary?: PackSummary;
    topFiles?: TopFile[];
    allFiles?: FileInfo[];
    suspiciousFiles?: SuspiciousFile[];
  };
}

export interface ErrorResponse {
  error: string;
}
