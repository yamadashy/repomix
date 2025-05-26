/**
 * Service for generating output in different formats
 */
import type { RepositoryEntity } from '../repository/RepositoryEntity.js';
import type { OutputOptions } from './OutputOptions.js';
import type { OutputResult } from './OutputResult.js';

export interface OutputService {
  /**
   * Generate output for a repository
   */
  generateOutput(
    repository: RepositoryEntity,
    processedFiles: Array<{ path: string; content: string }>,
    options: OutputOptions,
  ): Promise<OutputResult>;
}
