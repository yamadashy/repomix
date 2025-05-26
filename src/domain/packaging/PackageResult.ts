/**
 * Result of packaging a repository
 */
export interface PackageResult {
  /**
   * Total number of files processed
   */
  totalFiles: number;

  /**
   * Total number of characters in the output
   */
  totalCharacters: number;

  /**
   * Total number of tokens in the output
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

  /**
   * Token count for git diffs
   */
  gitDiffTokenCount: number;

  /**
   * The generated output content
   */
  output: string;
}
