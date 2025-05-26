/**
 * Service for packaging repository content
 */
import { RepositoryEntity } from '../repository/RepositoryEntity.js';
import { PackageOptions } from './PackageOptions.js';
import { PackageResult } from './PackageResult.js';

export interface PackagingService {
  /**
   * Package a repository into a single file
   */
  packageRepository(repository: RepositoryEntity, options: PackageOptions): Promise<PackageResult>;
}
