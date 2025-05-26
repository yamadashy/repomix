/**
 * Result of output generation
 */
export interface OutputResult {
  /**
   * Generated output content
   */
  content: string;
  
  /**
   * Total number of files included
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
}
