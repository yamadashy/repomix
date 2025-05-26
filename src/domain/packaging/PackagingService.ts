/**
 * Service for packaging repository content
 */
import type { RepositoryEntity } from '../repository/RepositoryEntity.js';
import type { PackageOptions } from './PackageOptions.js';
import type { PackageResult } from './PackageResult.js';

export interface PackagingService {
  /**
   * Package a repository into a single file
   */
  packageRepository(repository: RepositoryEntity, options: PackageOptions): Promise<PackageResult>;
}
