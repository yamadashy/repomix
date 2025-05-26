/**
 * Options for output generation
 */
export interface OutputOptions {
  /**
   * Output style (xml, markdown, plain)
   */
  outputStyle: 'xml' | 'markdown' | 'plain';
  
  /**
   * Whether to include file summary
   */
  includeSummary: boolean;
  
  /**
   * Whether to include directory structure
   */
  includeDirectoryStructure: boolean;
  
  /**
   * Whether to include file contents
   */
  includeFiles: boolean;
  
  /**
   * Whether to compress output
   */
  compress: boolean;
  
  /**
   * Whether to include git diffs
   */
  includeGitDiffs: boolean;
}
