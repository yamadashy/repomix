import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetTokenCountCacheForTests,
  contentCacheKey,
  getCached,
  getRepoSeenMarkerPath,
  isCacheDisabled,
  loadTokenCountCache,
  MAX_CACHE_ENTRIES,
  saveTokenCountCache,
  setCached,
  tokenCountCacheFileExistsSync,
  tokenCountCacheSeenMarkerExistsSync,
} from '../../../src/core/metrics/tokenCountCache.js';

describe('tokenCountCache', () => {
  let tmpDir: string;
  let cacheFile: string;
  const originalDisableEnv = process.env.REPOMIX_TOKEN_CACHE;
  const originalPathEnv = process.env.REPOMIX_TOKEN_CACHE_PATH;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-cache-test-'));
    cacheFile = path.join(tmpDir, 'token-counts.json');
    process.env.REPOMIX_TOKEN_CACHE_PATH = cacheFile;
    delete process.env.REPOMIX_TOKEN_CACHE;
    __resetTokenCountCacheForTests();
  });

  afterEach(async () => {
    if (originalDisableEnv === undefined) {
      delete process.env.REPOMIX_TOKEN_CACHE;
    } else {
      process.env.REPOMIX_TOKEN_CACHE = originalDisableEnv;
    }
    if (originalPathEnv === undefined) {
      delete process.env.REPOMIX_TOKEN_CACHE_PATH;
    } else {
      process.env.REPOMIX_TOKEN_CACHE_PATH = originalPathEnv;
    }
    __resetTokenCountCacheForTests();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('contentCacheKey', () => {
    it('produces stable keys for identical content/encoding pairs', () => {
      const a = contentCacheKey('o200k_base', 'hello world');
      const b = contentCacheKey('o200k_base', 'hello world');
      expect(a).toBe(b);
    });

    it('differs across encodings', () => {
      const a = contentCacheKey('o200k_base', 'hello');
      const b = contentCacheKey('cl100k_base', 'hello');
      expect(a).not.toBe(b);
    });

    it('differs across content', () => {
      const a = contentCacheKey('o200k_base', 'hello');
      const b = contentCacheKey('o200k_base', 'world');
      expect(a).not.toBe(b);
    });

    it('embeds the byte length so same-digest different-length inputs cannot collide', () => {
      const key = contentCacheKey('o200k_base', 'abc');
      const [encoding, byteLength] = key.split(':');
      expect(encoding).toBe('o200k_base');
      expect(byteLength).toBe('3');
    });
  });

  describe('load + save round-trip', () => {
    it('persists entries to disk and reloads them in a fresh process', async () => {
      const key = contentCacheKey('o200k_base', 'hello');
      setCached(key, 42);
      await saveTokenCountCache();

      __resetTokenCountCacheForTests();
      await loadTokenCountCache();
      expect(getCached(key)).toBe(42);
    });

    it('skips writing when nothing has been added since the last save', async () => {
      // Nothing dirty → no file should exist
      await saveTokenCountCache();
      await expect(fs.stat(cacheFile)).rejects.toThrow();
    });

    it('starts fresh when the cache file is missing', async () => {
      await loadTokenCountCache();
      expect(getCached('whatever:0:0000000000000000')).toBeUndefined();
    });

    it('starts fresh when the cache file is corrupt JSON', async () => {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, '{not valid json');
      await loadTokenCountCache();
      const key = contentCacheKey('o200k_base', 'x');
      expect(getCached(key)).toBeUndefined();
      // Subsequent writes should still succeed
      setCached(key, 7);
      await saveTokenCountCache();
      __resetTokenCountCacheForTests();
      await loadTokenCountCache();
      expect(getCached(key)).toBe(7);
    });

    it('discards entries when the on-disk version does not match', async () => {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, JSON.stringify({ version: 999, entries: { 'o200k_base:1:abc': 5 } }));
      await loadTokenCountCache();
      expect(getCached('o200k_base:1:abc')).toBeUndefined();
    });

    it('is atomic: the destination file is replaced via rename, not overwritten in place', async () => {
      const key = contentCacheKey('o200k_base', 'first');
      setCached(key, 1);
      await saveTokenCountCache();
      const firstStat = await fs.stat(cacheFile);

      const key2 = contentCacheKey('o200k_base', 'second');
      setCached(key2, 2);
      await saveTokenCountCache();
      const secondStat = await fs.stat(cacheFile);

      // Atomic rename gives the file a new inode on most filesystems.
      // The data, at minimum, must have been replaced cleanly.
      const raw = await fs.readFile(cacheFile, 'utf8');
      const data = JSON.parse(raw);
      expect(data.entries[key]).toBe(1);
      expect(data.entries[key2]).toBe(2);
      expect(secondStat.size).toBeGreaterThanOrEqual(firstStat.size);
    });
  });

  describe('FIFO eviction', () => {
    it('drops the oldest entries once the cap is exceeded on save', async () => {
      // Use a stub cap by directly inserting MAX + 5 entries
      for (let i = 0; i < MAX_CACHE_ENTRIES + 5; i++) {
        setCached(`o200k_base:1:${i.toString(16).padStart(16, '0')}`, i);
      }
      await saveTokenCountCache();

      __resetTokenCountCacheForTests();
      await loadTokenCountCache();

      // Oldest 5 dropped; newest preserved
      expect(getCached(`o200k_base:1:${(0).toString(16).padStart(16, '0')}`)).toBeUndefined();
      expect(getCached(`o200k_base:1:${(4).toString(16).padStart(16, '0')}`)).toBeUndefined();
      expect(getCached(`o200k_base:1:${(5).toString(16).padStart(16, '0')}`)).toBe(5);
      expect(getCached(`o200k_base:1:${(MAX_CACHE_ENTRIES + 4).toString(16).padStart(16, '0')}`)).toBe(
        MAX_CACHE_ENTRIES + 4,
      );
    });
  });

  describe('disable switch', () => {
    it('reports disabled when REPOMIX_TOKEN_CACHE=0', () => {
      process.env.REPOMIX_TOKEN_CACHE = '0';
      expect(isCacheDisabled()).toBe(true);
    });

    it('treats unset and other values as enabled', () => {
      delete process.env.REPOMIX_TOKEN_CACHE;
      expect(isCacheDisabled()).toBe(false);
      process.env.REPOMIX_TOKEN_CACHE = '1';
      expect(isCacheDisabled()).toBe(false);
    });

    it('skips load and save when disabled', async () => {
      process.env.REPOMIX_TOKEN_CACHE = '0';
      const key = contentCacheKey('o200k_base', 'hello');
      setCached(key, 99);
      await saveTokenCountCache();
      // No file should have been written
      await expect(fs.stat(cacheFile)).rejects.toThrow();

      __resetTokenCountCacheForTests();
      await loadTokenCountCache();
      expect(getCached(key)).toBeUndefined();
    });

    it('also disables the in-memory map so long-running processes do not grow unbounded', async () => {
      process.env.REPOMIX_TOKEN_CACHE = '0';
      await loadTokenCountCache();
      const key = contentCacheKey('o200k_base', 'memory');
      setCached(key, 11);
      // getCached returns undefined even though setCached was called
      expect(getCached(key)).toBeUndefined();
    });

    it('honors REPOMIX_TOKEN_CACHE=0 even when setCached/getCached run before load', () => {
      // Order-independence: a caller that bypasses loadTokenCountCache (or
      // calls setCached before load resolves) must still respect the env var.
      process.env.REPOMIX_TOKEN_CACHE = '0';
      const key = contentCacheKey('o200k_base', 'pre-load');
      setCached(key, 42);
      expect(getCached(key)).toBeUndefined();
    });
  });

  describe('in-memory eviction', () => {
    // Test against a smaller working set so the test stays fast — the eviction
    // logic in setCached uses MAX_CACHE_ENTRIES as the threshold and the
    // ordering invariant is independent of the absolute cap value. We assert
    // by inserting one entry beyond the cap and confirming the oldest is gone.
    it('evicts the oldest entry on insert when at the cap', async () => {
      // Fill the in-memory map to exactly the cap, then push one more.
      const firstKey = `o200k_base:1:${(0).toString(16).padStart(16, '0')}`;
      setCached(firstKey, 0);
      for (let i = 1; i < MAX_CACHE_ENTRIES; i++) {
        setCached(`o200k_base:1:${i.toString(16).padStart(16, '0')}`, i);
      }
      // At the cap; one more insertion of a new key must evict firstKey.
      const newKey = `o200k_base:1:${MAX_CACHE_ENTRIES.toString(16).padStart(16, '0')}`;
      setCached(newKey, MAX_CACHE_ENTRIES);

      expect(getCached(firstKey)).toBeUndefined();
      expect(getCached(newKey)).toBe(MAX_CACHE_ENTRIES);
    });

    it('refreshes (does not evict) when overwriting an existing key at the cap', async () => {
      const firstKey = `o200k_base:1:${(0).toString(16).padStart(16, '0')}`;
      setCached(firstKey, 0);
      for (let i = 1; i < MAX_CACHE_ENTRIES; i++) {
        setCached(`o200k_base:1:${i.toString(16).padStart(16, '0')}`, i);
      }
      // Overwriting an existing key must not trigger eviction.
      setCached(firstKey, 999);
      expect(getCached(firstKey)).toBe(999);
    });
  });

  describe('per-repo seen markers (warm-likely heuristic)', () => {
    // Regression set for the metrics-pool prewarm heuristic. The pool only
    // drops eager warm-up to 1 when BOTH the shared cache file exists AND
    // a per-repo marker exists. These tests pin three corners of that
    // contract — without them a future refactor could silently regress the
    // heuristic back to the "any cache file means warm" failure mode.

    it('an unrelated repo stays cold-likely even after the shared cache is populated', async () => {
      const repoA = ['/path/to/repo-a'];
      const repoB = ['/path/to/repo-b'];

      const key = contentCacheKey('o200k_base', 'shared content');
      setCached(key, 12);
      await saveTokenCountCache(repoA);

      // The shared cache file now exists machine-wide.
      expect(tokenCountCacheFileExistsSync()).toBe(true);
      // But repo B has never written, so the marker for it must be absent.
      expect(tokenCountCacheSeenMarkerExistsSync(repoB)).toBe(false);
      // And repo A's marker should be present.
      expect(tokenCountCacheSeenMarkerExistsSync(repoA)).toBe(true);
    });

    it('the same repo becomes warm-likely after a successful save', async () => {
      const repo = ['/some/repo'];

      // Before any save, neither file nor marker exist.
      expect(tokenCountCacheFileExistsSync()).toBe(false);
      expect(tokenCountCacheSeenMarkerExistsSync(repo)).toBe(false);

      const key = contentCacheKey('o200k_base', 'a');
      setCached(key, 1);
      await saveTokenCountCache(repo);

      // Both probes must agree the next pack is warm-likely.
      expect(tokenCountCacheFileExistsSync()).toBe(true);
      expect(tokenCountCacheSeenMarkerExistsSync(repo)).toBe(true);
    });

    it('a `--remote`-style fresh mkdtemp path does not see a stale marker', async () => {
      // First `--remote` invocation clones to a random temp dir and saves.
      const firstClone = ['/var/folders/T/repomix-AbCdEf'];
      const key = contentCacheKey('o200k_base', 'cloned content');
      setCached(key, 7);
      await saveTokenCountCache(firstClone);

      // Second `--remote` clones to a different random path (mkdtemp again).
      // Even though the shared cache and the previous clone's marker still
      // exist on disk, the new clone's marker is absent → prewarm decision
      // must fall back to cold.
      const secondClone = ['/var/folders/T/repomix-ZyXwVu'];
      expect(tokenCountCacheFileExistsSync()).toBe(true);
      expect(tokenCountCacheSeenMarkerExistsSync(firstClone)).toBe(true);
      expect(tokenCountCacheSeenMarkerExistsSync(secondClone)).toBe(false);
    });

    it('the marker is NOT created when the save is a no-op (nothing dirty)', async () => {
      const repo = ['/some/repo'];

      // No setCached → save short-circuits without writing the cache file
      // or touching the marker. Both must remain absent.
      await saveTokenCountCache(repo);

      expect(tokenCountCacheFileExistsSync()).toBe(false);
      expect(tokenCountCacheSeenMarkerExistsSync(repo)).toBe(false);
    });

    it('marker path is sensitive to the rootDirs list but insensitive to ordering', async () => {
      const a = getRepoSeenMarkerPath(['/a', '/b']);
      const b = getRepoSeenMarkerPath(['/b', '/a']);
      const c = getRepoSeenMarkerPath(['/a', '/c']);
      expect(a).toBe(b);
      expect(a).not.toBe(c);
    });
  });
});
