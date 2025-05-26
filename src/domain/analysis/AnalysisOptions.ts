/**
 * Options for analyzing a repository
 */
export interface AnalysisOptions {
  /**
   * Token count encoding to use
   */
  tokenCountEncoding: string;
  
  /**
   * Maximum number of top files to include in the result
   */
  topFilesLength: number;
}
