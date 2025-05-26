/**
 * Repository interface for accessing repository data
 */
import type { RepositoryEntity } from './RepositoryEntity.js';

export interface RepositoryRepository {
  /**
   * Get repository entity from root directories
   */
  getRepository(rootDirs: string[]): Promise<RepositoryEntity>;

  /**
   * Get repository entity from a remote URL
   */
  getRemoteRepository(remoteUrl: string, branch?: string): Promise<RepositoryEntity>;
}
