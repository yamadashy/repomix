/**
 * Interface for output generation service
 */
import { ProcessedFile } from '../filesystem/fileTypes.js';
import { GitDiffResult } from '../git/gitDiffHandle.js';

export interface OutputService {
  /**
   * Generate output for a repository
   */
  generateOutput(
    rootDirs: string[],
    processedFiles: ProcessedFile[],
    allFilePaths: string[],
    emptyDirPaths: string[],
    gitDiffResult?: GitDiffResult,
  ): Promise<string>;

  /**
   * Write output to file or stdout
   */
  writeOutput(output: string): Promise<void>;
}
