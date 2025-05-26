/**
 * Use case for packaging a repository
 */
import { RepositoryEntity } from '../../domain/repository/RepositoryEntity.js';
import { PackageOptions } from '../../domain/packaging/PackageOptions.js';
import { PackageResult } from '../../domain/packaging/PackageResult.js';
import { PackagingService } from '../../domain/packaging/PackagingService.js';
import { SecurityService } from '../../domain/security/SecurityService.js';
import { AnalysisService } from '../../domain/analysis/AnalysisService.js';
import { RepositoryRepository } from '../../domain/repository/RepositoryRepository.js';
import { RepomixProgressCallback } from '../../shared/types.js';

export class PackRepositoryUseCase {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly packagingService: PackagingService,
    private readonly securityService: SecurityService,
    private readonly analysisService: AnalysisService,
  ) {}

  /**
   * Execute the use case to package a repository
   */
  async execute(
    rootDirs: string[],
    options: PackageOptions,
    progressCallback: RepomixProgressCallback = () => {},
  ): Promise<PackageResult> {
    progressCallback('Fetching repository...');
    const repository = await this.repositoryRepository.getRepository(rootDirs);

    progressCallback('Scanning for security issues...');
    const securityResult = await this.securityService.scanRepository(repository, {
      enableSecurityCheck: true,
    });

    progressCallback('Packaging repository...');
    const packageResult = await this.packagingService.packageRepository(repository, options);

    return packageResult;
  }
}
