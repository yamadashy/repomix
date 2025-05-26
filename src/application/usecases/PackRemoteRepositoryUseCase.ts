import type { AnalysisService } from '../../domain/analysis/AnalysisService.js';
/**
 * Use case for packaging a remote repository
 */
import type { PackageOptions } from '../../domain/packaging/PackageOptions.js';
import type { PackageResult } from '../../domain/packaging/PackageResult.js';
import type { PackagingService } from '../../domain/packaging/PackagingService.js';
import type { RepositoryRepository } from '../../domain/repository/RepositoryRepository.js';
import type { SecurityService } from '../../domain/security/SecurityService.js';
import type { RepomixProgressCallback } from '../../shared/types.js';

export class PackRemoteRepositoryUseCase {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly packagingService: PackagingService,
    private readonly securityService: SecurityService,
    private readonly analysisService: AnalysisService,
  ) {}

  /**
   * Execute the use case to package a remote repository
   */
  async execute(
    remoteUrl: string,
    branch: string | undefined,
    options: PackageOptions,
    progressCallback: RepomixProgressCallback = () => {},
  ): Promise<PackageResult> {
    progressCallback('Fetching remote repository...');
    const repository = await this.repositoryRepository.getRemoteRepository(remoteUrl, branch);

    progressCallback('Scanning for security issues...');
    const securityResult = await this.securityService.scanRepository(repository, {
      enableSecurityCheck: true,
    });

    progressCallback('Packaging repository...');
    const packageResult = await this.packagingService.packageRepository(repository, options);

    return packageResult;
  }
}
