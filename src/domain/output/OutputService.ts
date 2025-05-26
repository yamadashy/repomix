/**
 * Service for generating output in different formats
 */
import { RepositoryEntity } from '../repository/RepositoryEntity.js';
import { OutputOptions } from './OutputOptions.js';
import { OutputResult } from './OutputResult.js';

export interface OutputService {
  /**
   * Generate output for a repository
   */
  generateOutput(
    repository: RepositoryEntity, 
    processedFiles: Array<{ path: string; content: string }>,
    options: OutputOptions
  ): Promise<OutputResult>;
}
