/**
 * Options for packaging a repository
 */
export interface PackageOptions {
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
   * Whether to remove comments
   */
  removeComments: boolean;
  
  /**
   * Whether to remove empty lines
   */
  removeEmptyLines: boolean;
  
  /**
   * Whether to compress output
   */
  compress: boolean;
  
  /**
   * Whether to include git diffs
   */
  includeGitDiffs: boolean;
}
