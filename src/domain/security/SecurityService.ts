/**
 * Service for security scanning of repository content
 */
import { RepositoryEntity } from '../repository/RepositoryEntity.js';
import { SecurityScanResult } from './SecurityScanResult.js';
import { SecurityScanOptions } from './SecurityScanOptions.js';

export interface SecurityService {
  /**
   * Scan a repository for security issues
   */
  scanRepository(repository: RepositoryEntity, options: SecurityScanOptions): Promise<SecurityScanResult>;
}
