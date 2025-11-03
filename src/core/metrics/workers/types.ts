export interface FileMetrics {
  path: string;
  charCount: number;
  tokenCount: number;
  originalTokenCount?: number;
  truncated?: boolean;
}
