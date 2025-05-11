export interface PackOptions {
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  showLineNumbers?: boolean;
  fileSummary?: boolean;
  directoryStructure?: boolean;
  includePatterns?: string;
  files?: boolean;
  ignorePatterns?: string;
  outputParsable?: boolean;
  compress?: boolean;
}

interface TopFile {
  path: string;
  charCount: number;
  tokenCount: number;
}

interface PackSummary {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
}

export interface PackResult {
  content: string;
  format: string;
  metadata: {
    repository: string;
    timestamp: string;
    summary?: PackSummary;
    topFiles?: TopFile[];
  };
}

export interface ErrorResponse {
  error: string;
}
