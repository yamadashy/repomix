/**
 * Result of analyzing a repository
 */
export interface AnalysisResult {
  /**
   * Total number of files analyzed
   */
  totalFiles: number;

  /**
   * Total number of characters in all files
   */
  totalCharacters: number;

  /**
   * Total number of tokens in all files
   */
  totalTokens: number;

  /**
   * Character counts by file path
   */
  fileCharCounts: Record<string, number>;

  /**
   * Token counts by file path
   */
  fileTokenCounts: Record<string, number>;
}
