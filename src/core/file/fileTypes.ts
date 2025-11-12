export interface RawFile {
  path: string;
  content: string;
}

export interface ProcessedFile {
  path: string;
  content: string;
  originalContent?: string;
  truncation?: TruncationInfo;
}

export interface TruncationInfo {
  truncated: boolean;
  originalLineCount: number;
  truncatedLineCount: number;
  lineLimit: number;
}

export interface TruncationMetrics {
  totalFilesProcessed: number;
  truncatedFilesCount: number;
  totalOriginalLines: number;
  totalTruncatedLines: number;
  lineLimitUsed: number | null;
  perFileTruncation?: PerFileTruncation[];
  totalOriginalTokens?: number;
  totalTruncatedTokens?: number;
  tokenReductionPercentage?: number;
}

export interface PerFileTruncation {
  filePath: string;
  originalLines: number;
  truncatedLines: number;
  truncated: boolean;
  lineLimit: number;
}
