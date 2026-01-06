import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CacheManager, type CacheManagerDeps } from '../../../src/mcp/cache/cacheManager.js';
import type { CacheMetadata } from '../../../src/mcp/cache/cacheTypes.js';

describe('CacheManager', () => {
  const mockDeps: CacheManagerDeps = {
    execFileAsync: vi.fn(),
    fsReadFile: vi.fn(),
    fsWriteFile: vi.fn(),
    fsMkdir: vi.fn(),
    fsRm: vi.fn(),
    fsAccess: vi.fn(),
    fsStat: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('check', () => {
    it('should return not exists when cache files are missing', async () => {
      (mockDeps.fsAccess as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

      const manager = new CacheManager('/cache', '/root', mockDeps);
      const result = await manager.check('test-module', 'path/to/module', false);

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.invalidReason).toBe('Cache files not found');
    });

    it('should return valid when cache exists and commit matches', async () => {
      (mockDeps.fsAccess as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const metadata: CacheMetadata = {
        submodule: 'test-module',
        generatedAt: new Date().toISOString(),
        gitCommit: 'abc123',
        fileCount: 10,
        tokenCount: 1000,
        dependencies: [],
        repomixVersion: '1.0.0',
        compressed: true,
      };

      (mockDeps.fsReadFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(metadata));
      (mockDeps.execFileAsync as ReturnType<typeof vi.fn>).mockResolvedValue({ stdout: 'abc123\n', stderr: '' });

      const manager = new CacheManager('/cache', '/root', mockDeps);
      const result = await manager.check('test-module', 'path/to/module', false);

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.meta).toEqual(metadata);
    });

    it('should return invalid when commit has changed', async () => {
      (mockDeps.fsAccess as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const metadata: CacheMetadata = {
        submodule: 'test-module',
        generatedAt: new Date().toISOString(),
        gitCommit: 'old-commit',
        fileCount: 10,
        tokenCount: 1000,
        dependencies: [],
        repomixVersion: '1.0.0',
        compressed: true,
      };

      (mockDeps.fsReadFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(metadata));
      (mockDeps.execFileAsync as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ stdout: 'new-commit\n', stderr: '' }) // getCurrentCommit
        .mockResolvedValueOnce({ stdout: 'file1.ts\nfile2.ts\n', stderr: '' }); // git diff

      const manager = new CacheManager('/cache', '/root', mockDeps);
      const result = await manager.check('test-module', 'path/to/module', false);

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.invalidReason).toBe('Content has changed since cache was created');
    });
  });

  describe('set', () => {
    it('should write cache files', async () => {
      (mockDeps.fsMkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockDeps.fsWriteFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const manager = new CacheManager('/cache', '/root', mockDeps);
      await manager.set('test-module', '<content>test</content>', {
        submodule: 'test-module',
        gitCommit: 'abc123',
        fileCount: 10,
        tokenCount: 1000,
        dependencies: [],
        repomixVersion: '1.0.0',
        compressed: true,
      });

      expect(mockDeps.fsMkdir).toHaveBeenCalledWith('/cache', { recursive: true });
      expect(mockDeps.fsWriteFile).toHaveBeenCalledTimes(2); // meta + content
    });
  });

  describe('invalidate', () => {
    it('should remove cache files', async () => {
      (mockDeps.fsRm as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const manager = new CacheManager('/cache', '/root', mockDeps);
      await manager.invalidate('test-module');

      expect(mockDeps.fsRm).toHaveBeenCalledWith('/cache/test-module.meta.json', { force: true });
      expect(mockDeps.fsRm).toHaveBeenCalledWith('/cache/test-module.xml', { force: true });
    });
  });

  describe('invalidateAll', () => {
    it('should remove entire cache directory', async () => {
      (mockDeps.fsRm as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const manager = new CacheManager('/cache', '/root', mockDeps);
      await manager.invalidateAll();

      expect(mockDeps.fsRm).toHaveBeenCalledWith('/cache', { recursive: true, force: true });
    });
  });

  describe('getSubmoduleGitCommit', () => {
    it('should get commit for regular directory from main repo', async () => {
      (mockDeps.execFileAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: 'main-repo-commit\n',
        stderr: '',
      });

      const manager = new CacheManager('/cache', '/root', mockDeps);
      const commit = await manager.getSubmoduleGitCommit('path/to/module', false);

      expect(commit).toBe('main-repo-commit');
      expect(mockDeps.execFileAsync).toHaveBeenCalledWith('git', ['-C', '/root', 'rev-parse', 'HEAD']);
    });

    it('should get commit for git submodule from submodule directory', async () => {
      (mockDeps.execFileAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: 'submodule-commit\n',
        stderr: '',
      });

      const manager = new CacheManager('/cache', '/root', mockDeps);
      const commit = await manager.getSubmoduleGitCommit('path/to/submodule', true);

      expect(commit).toBe('submodule-commit');
      expect(mockDeps.execFileAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/root/path/to/submodule',
        'rev-parse',
        'HEAD',
      ]);
    });
  });
});
