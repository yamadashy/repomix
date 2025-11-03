export interface RawFile {
  path: string;
  content: string;
}

export interface ProcessedFile {
  path: string;
  content: string;
  truncation?: TruncationInfo;
}

export interface TruncationInfo {
  truncated: boolean;
  originalLineCount: number;
  truncatedLineCount: number;
  lineLimit: number;
}
