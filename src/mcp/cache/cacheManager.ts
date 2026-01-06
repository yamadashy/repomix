import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { logger } from '../../shared/logger.js';
import type { CacheCheckResult, CachedContent, CacheMetadata } from './cacheTypes.js';

const execFileAsync = promisify(execFile);

/**
 * Default dependencies for CacheManager (for testability)
 */
export interface CacheManagerDeps {
  execFileAsync: typeof execFileAsync;
  fsReadFile: typeof fs.readFile;
  fsWriteFile: typeof fs.writeFile;
  fsMkdir: typeof fs.mkdir;
  fsRm: typeof fs.rm;
  fsAccess: typeof fs.access;
  fsStat: typeof fs.stat;
}

const defaultDeps: CacheManagerDeps = {
  execFileAsync,
  fsReadFile: fs.readFile,
  fsWriteFile: fs.writeFile,
  fsMkdir: fs.mkdir,
  fsRm: fs.rm,
  fsAccess: fs.access,
  fsStat: fs.stat,
};

/**
 * Manages cache for monorepo submodules
 */
export class CacheManager {
  private cacheDir: string;
  private rootDir: string;
  private deps: CacheManagerDeps;

  constructor(cacheDir: string, rootDir: string = process.cwd(), deps: CacheManagerDeps = defaultDeps) {
    this.cacheDir = cacheDir;
    this.rootDir = rootDir;
    this.deps = deps;
  }

  /**
   * Get the full path for a submodule's cache file
   */
  private getContentPath(submoduleName: string): string {
    return path.join(this.cacheDir, `${submoduleName}.xml`);
  }

  /**
   * Get the full path for a submodule's metadata file
   */
  private getMetaPath(submoduleName: string): string {
    return path.join(this.cacheDir, `${submoduleName}.meta.json`);
  }

  /**
   * Check if a file exists
   */
  private async exists(filePath: string): Promise<boolean> {
    try {
      await this.deps.fsAccess(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read metadata from cache
   */
  private async readMeta(metaPath: string): Promise<CacheMetadata> {
    const content = await this.deps.fsReadFile(metaPath, 'utf-8');
    return JSON.parse(content) as CacheMetadata;
  }

  /**
   * Get current git commit for a submodule
   * If it's a git submodule, reads the submodule's HEAD
   * Otherwise reads the main repository's HEAD
   */
  async getSubmoduleGitCommit(submodulePath: string, isGitSubmodule: boolean): Promise<string> {
    try {
      if (isGitSubmodule) {
        // Git submodule: read its own HEAD
        const fullPath = path.join(this.rootDir, submodulePath);
        const result = await this.deps.execFileAsync('git', ['-C', fullPath, 'rev-parse', 'HEAD']);
        return result.stdout.trim();
      }
      // Normal directory: read main repo HEAD
      const result = await this.deps.execFileAsync('git', ['-C', this.rootDir, 'rev-parse', 'HEAD']);
      return result.stdout.trim();
    } catch (error) {
      logger.trace(`Failed to get git commit for ${submodulePath}:`, (error as Error).message);
      return '';
    }
  }

  /**
   * Check if a submodule has changed since the cached commit
   */
  async hasChangedSince(submodulePath: string, isGitSubmodule: boolean, lastCommit: string): Promise<boolean> {
    try {
      const currentCommit = await this.getSubmoduleGitCommit(submodulePath, isGitSubmodule);

      if (!currentCommit || !lastCommit) {
        return true; // Assume changed if we can't determine
      }

      if (currentCommit === lastCommit) {
        return false; // Same commit, no changes
      }

      // Further check: are there actual file changes in this submodule?
      if (isGitSubmodule) {
        const fullPath = path.join(this.rootDir, submodulePath);
        const result = await this.deps.execFileAsync('git', [
          '-C',
          fullPath,
          'diff',
          '--name-only',
          lastCommit,
          currentCommit,
        ]);
        return result.stdout.trim().length > 0;
      }
      // Normal directory: check for changes in that path
      const result = await this.deps.execFileAsync('git', [
        '-C',
        this.rootDir,
        'diff',
        '--name-only',
        lastCommit,
        currentCommit,
        '--',
        `${submodulePath}/`,
      ]);
      return result.stdout.trim().length > 0;
    } catch (error) {
      logger.trace(`Failed to check changes for ${submodulePath}:`, (error as Error).message);
      return true; // Assume changed on error
    }
  }

  /**
   * Check cache status for a submodule
   */
  async check(submoduleName: string, submodulePath: string, isGitSubmodule: boolean): Promise<CacheCheckResult> {
    const metaPath = this.getMetaPath(submoduleName);
    const contentPath = this.getContentPath(submoduleName);

    // Check if cache files exist
    if (!(await this.exists(metaPath)) || !(await this.exists(contentPath))) {
      return {
        exists: false,
        valid: false,
        invalidReason: 'Cache files not found',
      };
    }

    try {
      const meta = await this.readMeta(metaPath);

      // Check if content has changed
      const hasChanged = await this.hasChangedSince(submodulePath, isGitSubmodule, meta.gitCommit);

      if (hasChanged) {
        return {
          exists: true,
          valid: false,
          meta,
          invalidReason: 'Content has changed since cache was created',
        };
      }

      return {
        exists: true,
        valid: true,
        meta,
      };
    } catch (error) {
      return {
        exists: true,
        valid: false,
        invalidReason: `Failed to read cache metadata: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get cached content for a submodule
   */
  async get(submoduleName: string, submodulePath: string, isGitSubmodule: boolean): Promise<CachedContent | null> {
    const checkResult = await this.check(submoduleName, submodulePath, isGitSubmodule);

    if (!checkResult.exists || !checkResult.valid || !checkResult.meta) {
      return null;
    }

    try {
      const content = await this.deps.fsReadFile(this.getContentPath(submoduleName), 'utf-8');
      return {
        content,
        meta: checkResult.meta,
      };
    } catch (error) {
      logger.trace(`Failed to read cache content for ${submoduleName}:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Save content to cache
   */
  async set(submoduleName: string, content: string, meta: Omit<CacheMetadata, 'generatedAt'>): Promise<void> {
    const metaPath = this.getMetaPath(submoduleName);
    const contentPath = this.getContentPath(submoduleName);

    const fullMeta: CacheMetadata = {
      ...meta,
      generatedAt: new Date().toISOString(),
    };

    // Ensure cache directory exists
    await this.deps.fsMkdir(this.cacheDir, { recursive: true });

    // Write files
    await this.deps.fsWriteFile(metaPath, JSON.stringify(fullMeta, null, 2), 'utf-8');
    await this.deps.fsWriteFile(contentPath, content, 'utf-8');

    logger.trace(`Cache saved for ${submoduleName}`);
  }

  /**
   * Invalidate cache for a submodule
   */
  async invalidate(submoduleName: string): Promise<void> {
    const metaPath = this.getMetaPath(submoduleName);
    const contentPath = this.getContentPath(submoduleName);

    await this.deps.fsRm(metaPath, { force: true });
    await this.deps.fsRm(contentPath, { force: true });

    logger.trace(`Cache invalidated for ${submoduleName}`);
  }

  /**
   * Invalidate all caches
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.deps.fsRm(this.cacheDir, { recursive: true, force: true });
      logger.trace('All caches invalidated');
    } catch (error) {
      logger.trace('Failed to invalidate all caches:', (error as Error).message);
    }
  }

  /**
   * List all cached submodules
   */
  async listCached(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
      return metaFiles.map((f) => f.replace('.meta.json', ''));
    } catch {
      return [];
    }
  }
}
