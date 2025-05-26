import type { PackRemoteRepositoryUseCase } from '../../application/usecases/PackRemoteRepositoryUseCase.js';
/**
 * CLI controller for handling command line interface
 */
import type { PackRepositoryUseCase } from '../../application/usecases/PackRepositoryUseCase.js';
import type { PackageOptions } from '../../domain/packaging/PackageOptions.js';
import type { RepomixConfigMerged } from '../../shared/config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

export class CliController {
  constructor(
    private readonly packRepositoryUseCase: PackRepositoryUseCase,
    private readonly packRemoteRepositoryUseCase: PackRemoteRepositoryUseCase,
    private readonly config: RepomixConfigMerged,
  ) {}

  /**
   * Run the default action to package local repository
   */
  async runDefaultAction(rootDirs: string[]): Promise<void> {
    try {
      const packageOptions: PackageOptions = {
        outputStyle: this.config.output.style,
        includeSummary: this.config.output.fileSummary,
        includeDirectoryStructure: this.config.output.directoryStructure,
        includeFiles: this.config.output.files,
        removeComments: this.config.output.removeComments,
        removeEmptyLines: this.config.output.removeEmptyLines,
        compress: this.config.output.compress,
        includeGitDiffs: this.config.output.git.includeDiffs,
      };

      const result = await this.packRepositoryUseCase.execute(rootDirs, packageOptions, (message) =>
        logger.info(message),
      );

      logger.success(
        `✓ Successfully packaged ${result.totalFiles} files (${result.totalCharacters} characters, ${result.totalTokens} tokens)`,
      );
    } catch (error) {
      if (error instanceof RepomixError) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  }

  /**
   * Run the remote action to package remote repository
   */
  async runRemoteAction(remoteUrl: string, branch?: string): Promise<void> {
    try {
      const packageOptions: PackageOptions = {
        outputStyle: this.config.output.style,
        includeSummary: this.config.output.fileSummary,
        includeDirectoryStructure: this.config.output.directoryStructure,
        includeFiles: this.config.output.files,
        removeComments: this.config.output.removeComments,
        removeEmptyLines: this.config.output.removeEmptyLines,
        compress: this.config.output.compress,
        includeGitDiffs: this.config.output.git.includeDiffs,
      };

      const result = await this.packRemoteRepositoryUseCase.execute(remoteUrl, branch, packageOptions, (message) =>
        logger.info(message),
      );

      logger.success(
        `✓ Successfully packaged remote repository (${result.totalCharacters} characters, ${result.totalTokens} tokens)`,
      );
    } catch (error) {
      if (error instanceof RepomixError) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  }
}
