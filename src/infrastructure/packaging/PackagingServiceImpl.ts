import type { PackageOptions } from '../../domain/packaging/PackageOptions.js';
import type { PackageResult } from '../../domain/packaging/PackageResult.js';
import type { PackagingService } from '../../domain/packaging/PackagingService.js';
/**
 * Implementation of packaging service
 */
import type { RepositoryEntity } from '../../domain/repository/RepositoryEntity.js';
import type { RepomixConfigMerged } from '../../shared/config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { processFiles } from '../filesystem/fileProcess.js';
import type { TokenCounter } from '../metrics/TokenCounter.js';
import type { OutputService } from '../output/OutputService.js';

export class PackagingServiceImpl implements PackagingService {
  constructor(
    private readonly outputService: OutputService,
    private readonly tokenCounter: TokenCounter,
    private readonly config: RepomixConfigMerged,
  ) {}

  /**
   * Package a repository according to the provided options
   */
  async packageRepository(repository: RepositoryEntity, options: PackageOptions): Promise<PackageResult> {
    try {
      logger.debug('Processing files...');
      const processedFiles = await processFiles(repository.filePaths, {
        removeComments: options.removeComments,
        removeEmptyLines: options.removeEmptyLines,
      });

      logger.debug('Generating output...');
      const output = await this.outputService.generateOutput(
        repository.rootDirs,
        processedFiles,
        repository.filePaths,
        repository.emptyDirPaths,
      );

      logger.debug('Calculating metrics...');
      const fileCharCounts: Record<string, number> = {};
      const fileTokenCounts: Record<string, number> = {};

      let totalCharacters = 0;
      let totalTokens = 0;

      for (const file of processedFiles) {
        const charCount = file.content.length;
        const tokenCount = await this.tokenCounter.countTokens(file.content);

        fileCharCounts[file.path] = charCount;
        fileTokenCounts[file.path] = tokenCount;

        totalCharacters += charCount;
        totalTokens += tokenCount;
      }

      await this.outputService.writeOutput(output);

      return {
        totalFiles: processedFiles.length,
        totalCharacters,
        totalTokens,
        fileCharCounts,
        fileTokenCounts,
        gitDiffTokenCount: 0, // Will be implemented later
        output,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new RepomixError(`Failed to package repository: ${error.message}`);
      }
      throw new RepomixError('Failed to package repository: Unknown error');
    }
  }
}
