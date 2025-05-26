/**
 * Repository entity representing a code repository
 */
export interface RepositoryEntity {
  /**
   * Root directory paths of the repository
   */
  rootDirs: string[];
  
  /**
   * All file paths in the repository
   */
  filePaths: string[];
  
  /**
   * Empty directory paths in the repository
   */
  emptyDirPaths: string[];
}
