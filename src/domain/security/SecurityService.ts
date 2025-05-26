/**
 * Service for security scanning of repository content
 */
import type { RepositoryEntity } from '../repository/RepositoryEntity.js';
import type { SecurityScanOptions } from './SecurityScanOptions.js';
import type { SecurityScanResult } from './SecurityScanResult.js';

export interface SecurityService {
  /**
   * Scan a repository for security issues
   */
  scanRepository(repository: RepositoryEntity, options: SecurityScanOptions): Promise<SecurityScanResult>;
}
