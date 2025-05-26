/**
 * Implementation of repository repository using filesystem
 */
import { RepositoryEntity } from '../../domain/repository/RepositoryEntity.js';
import { RepositoryRepository } from '../../domain/repository/RepositoryRepository.js';
import type { RepomixConfigMerged } from '../../shared/config/configSchema.js';
import { searchFiles } from './fileSearch.js';
import { sortPaths } from './filePathSort.js';

export class FilesystemRepositoryImpl implements RepositoryRepository {
  constructor(private readonly config: RepomixConfigMerged) {}

  /**
   * Get repository entity from root directories
   */
  async getRepository(rootDirs: string[]): Promise<RepositoryEntity> {
    const filePathsByDir = await Promise.all(
      rootDirs.map(async (rootDir) => ({
        rootDir,
        searchResult: await searchFiles(rootDir, this.config),
      })),
    );

    const allFilePaths = filePathsByDir.flatMap(({ searchResult }) => searchResult.filePaths);
    
    const sortedFilePaths = await sortPaths(allFilePaths);
    
    const allEmptyDirPaths = filePathsByDir.flatMap(({ searchResult }) => searchResult.emptyDirPaths);

    return {
      rootDirs,
      filePaths: sortedFilePaths,
      emptyDirPaths: allEmptyDirPaths,
    };
  }

  /**
   * Get repository entity from a remote URL
   */
  async getRemoteRepository(remoteUrl: string, branch?: string): Promise<RepositoryEntity> {
    throw new Error('Not implemented');
  }
}
