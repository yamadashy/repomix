import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetSecurityResultCacheForTests,
  getCached,
  getCacheFilePath,
  isCacheDisabled,
  loadSecurityResultCache,
  MAX_CACHE_ENTRIES,
  saveSecurityResultCache,
  securityResultCacheKey,
  setCachedClean,
} from '../../../src/core/security/securityResultCache.js';

describe('securityResultCache', () => {
  let tmpDir: string;
  let cacheFile: string;
  const originalDisableEnv = process.env.REPOMIX_SECURITY_CACHE;
  const originalPathEnv = process.env.REPOMIX_SECURITY_CACHE_PATH;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-sec-cache-test-'));
    cacheFile = path.join(tmpDir, 'security-results.json');
    process.env.REPOMIX_SECURITY_CACHE_PATH = cacheFile;
    delete process.env.REPOMIX_SECURITY_CACHE;
    __resetSecurityResultCacheForTests();
  });

  afterEach(async () => {
    if (originalDisableEnv === undefined) {
      delete process.env.REPOMIX_SECURITY_CACHE;
    } else {
      process.env.REPOMIX_SECURITY_CACHE = originalDisableEnv;
    }
    if (originalPathEnv === undefined) {
      delete process.env.REPOMIX_SECURITY_CACHE_PATH;
    } else {
      process.env.REPOMIX_SECURITY_CACHE_PATH = originalPathEnv;
    }
    __resetSecurityResultCacheForTests();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('securityResultCacheKey', () => {
    it('produces stable keys for identical content/path pairs', () => {
      expect(securityResultCacheKey('hello world', 'src/a.ts')).toBe(securityResultCacheKey('hello world', 'src/a.ts'));
    });

    it('differs across content', () => {
      expect(securityResultCacheKey('hello', 'src/a.ts')).not.toBe(securityResultCacheKey('world', 'src/a.ts'));
    });

    it('differs across file path (so package.json never shares a key with another .json)', () => {
      // Some preset rules branch on the file name, so identical content at
      // different paths must hash to different keys.
      expect(securityResultCacheKey('{}', 'package.json')).not.toBe(securityResultCacheKey('{}', 'config.json'));
    });

    it('distinguishes different-length content (byte length in the key)', () => {
      const a = securityResultCacheKey('a', 'src/a.ts');
      const b = securityResultCacheKey('aa', 'src/a.ts');
      expect(a).not.toBe(b);
    });
  });

  describe('get/set', () => {
    it('records a clean verdict as [] and returns it on a hit', () => {
      const cleanKey = securityResultCacheKey('clean content', 'ts');
      setCachedClean(cleanKey);
      expect(getCached(cleanKey)).toEqual([]);
    });

    it('returns undefined for an unknown key (a cache miss is distinct from a clean hit)', () => {
      expect(getCached(securityResultCacheKey('never stored', 'ts'))).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('saves clean verdicts to disk and reloads them into a fresh in-memory state', async () => {
      const cleanKeyA = securityResultCacheKey('clean a', 'ts');
      const cleanKeyB = securityResultCacheKey('clean b', 'env');
      setCachedClean(cleanKeyA);
      setCachedClean(cleanKeyB);
      await saveSecurityResultCache();

      // Simulate a fresh process: drop in-memory state and reload from disk.
      __resetSecurityResultCacheForTests();
      await loadSecurityResultCache();

      expect(getCached(cleanKeyA)).toEqual([]);
      expect(getCached(cleanKeyB)).toEqual([]);
    });

    it('persists only empty arrays — never any message text', async () => {
      setCachedClean(securityResultCacheKey('clean a', 'ts'));
      setCachedClean(securityResultCacheKey('clean b', 'env'));
      await saveSecurityResultCache();

      const raw = await fs.readFile(cacheFile, 'utf8');
      const data = JSON.parse(raw) as { entries: Record<string, string[]> };
      for (const value of Object.values(data.entries)) {
        expect(value).toEqual([]);
      }
    });

    it('does not write a file when nothing was cached', async () => {
      await saveSecurityResultCache();
      await expect(fs.access(cacheFile)).rejects.toThrow();
    });

    it('discards a cache file with a mismatched version', async () => {
      await fs.writeFile(cacheFile, JSON.stringify({ version: 999, entries: { 'ts:1:abc': [] } }));
      __resetSecurityResultCacheForTests();
      await loadSecurityResultCache();
      expect(getCached('ts:1:abc')).toBeUndefined();
    });

    it('degrades to an empty cache on a corrupt file', async () => {
      await fs.writeFile(cacheFile, 'not valid json {');
      __resetSecurityResultCacheForTests();
      await expect(loadSecurityResultCache()).resolves.toBeUndefined();
      expect(getCached('anything')).toBeUndefined();
    });
  });

  describe('disabled via env', () => {
    it('reports disabled and serves only misses when REPOMIX_SECURITY_CACHE=0', () => {
      process.env.REPOMIX_SECURITY_CACHE = '0';
      expect(isCacheDisabled()).toBe(true);
      const key = securityResultCacheKey('content', 'ts');
      setCachedClean(key);
      expect(getCached(key)).toBeUndefined();
    });

    it('embeds the secretlint version in the default cache file name', () => {
      delete process.env.REPOMIX_SECURITY_CACHE_PATH;
      // Default path is derived from the installed secretlint preset version, so a
      // rule upgrade reads from a fresh file rather than trusting stale verdicts.
      expect(path.basename(getCacheFilePath())).toMatch(/^security-results-.+\.json$/);
    });
  });

  describe('eviction', () => {
    it('bounds the in-memory working set at MAX_CACHE_ENTRIES (FIFO)', () => {
      const firstKey = securityResultCacheKey('entry-0', 'ts');
      for (let i = 0; i < MAX_CACHE_ENTRIES + 5; i++) {
        setCachedClean(securityResultCacheKey(`entry-${i}`, 'ts'));
      }
      // The oldest inserted key is evicted once the cap is exceeded.
      expect(getCached(firstKey)).toBeUndefined();
      // The most recent key survives.
      expect(getCached(securityResultCacheKey(`entry-${MAX_CACHE_ENTRIES + 4}`, 'ts'))).toEqual([]);
    });
  });
});
