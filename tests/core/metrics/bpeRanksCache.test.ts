import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  getBpeRanksCachePath,
  readBpeRanksCache,
  writeBpeRanksCache,
} from '../../../src/core/metrics/bpeRanksCache.js';

// A small stand-in for the real BPE ranks: a mix of strings and single-element
// byte arrays, mirroring the shape gpt-tokenizer returns (and the JSON
// round-trip that token correctness depends on).
const SAMPLE_RANKS: unknown = ['!', '"', '#', [161], [194, 162]];

describe('bpeRanksCache', () => {
  let tmpDir: string;
  let prevPathEnv: string | undefined;
  let prevDisableEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomix-bpe-test-'));
    prevPathEnv = process.env.REPOMIX_BPE_RANKS_CACHE_PATH;
    prevDisableEnv = process.env.REPOMIX_TOKEN_CACHE;
    process.env.REPOMIX_BPE_RANKS_CACHE_PATH = tmpDir;
    // The suite disables caching globally; enable it for these tests.
    delete process.env.REPOMIX_TOKEN_CACHE;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (prevPathEnv === undefined) {
      delete process.env.REPOMIX_BPE_RANKS_CACHE_PATH;
    } else {
      process.env.REPOMIX_BPE_RANKS_CACHE_PATH = prevPathEnv;
    }
    if (prevDisableEnv === undefined) {
      delete process.env.REPOMIX_TOKEN_CACHE;
    } else {
      process.env.REPOMIX_TOKEN_CACHE = prevDisableEnv;
    }
  });

  test('getBpeRanksCachePath honors the path override and includes the encoding name', () => {
    const cachePath = getBpeRanksCachePath('o200k_base');
    expect(path.dirname(cachePath)).toBe(tmpDir);
    expect(path.basename(cachePath)).toMatch(/^o200k_base-.*\.json$/);
  });

  test('returns undefined on a cache miss', () => {
    expect(readBpeRanksCache('o200k_base')).toBeUndefined();
  });

  test('write then read round-trips the ranks (including byte-array entries)', () => {
    writeBpeRanksCache('o200k_base', SAMPLE_RANKS);
    expect(fs.existsSync(getBpeRanksCachePath('o200k_base'))).toBe(true);
    expect(readBpeRanksCache('o200k_base')).toEqual(SAMPLE_RANKS);
  });

  test('a corrupt cache file falls back to a miss without throwing', () => {
    fs.writeFileSync(getBpeRanksCachePath('o200k_base'), 'not valid json {{{');
    expect(readBpeRanksCache('o200k_base')).toBeUndefined();
  });

  test.each([
    ['an object', '{}'],
    ['a number', '42'],
    ['null', 'null'],
    ['an empty array', '[]'],
  ])('rejects structurally-valid-but-wrong cache content (%s) as a miss', (_label, content) => {
    fs.writeFileSync(getBpeRanksCachePath('o200k_base'), content);
    expect(readBpeRanksCache('o200k_base')).toBeUndefined();
  });

  test('leaves no stray temp files after a write', () => {
    writeBpeRanksCache('o200k_base', SAMPLE_RANKS);
    const leftovers = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  test('different encodings use distinct cache files', () => {
    writeBpeRanksCache('o200k_base', ['a']);
    writeBpeRanksCache('cl100k_base', ['b']);
    expect(readBpeRanksCache('o200k_base')).toEqual(['a']);
    expect(readBpeRanksCache('cl100k_base')).toEqual(['b']);
  });

  describe('when caching is disabled via REPOMIX_TOKEN_CACHE=0', () => {
    beforeEach(() => {
      process.env.REPOMIX_TOKEN_CACHE = '0';
    });

    test('read returns undefined and write is a no-op', () => {
      writeBpeRanksCache('o200k_base', SAMPLE_RANKS);
      // Path is computed independent of the disable flag, so the file must be absent.
      expect(fs.existsSync(getBpeRanksCachePath('o200k_base'))).toBe(false);
      expect(readBpeRanksCache('o200k_base')).toBeUndefined();
    });

    test('read returns undefined even when a cache file exists', () => {
      // Write a file directly, bypassing the disabled writer.
      fs.writeFileSync(getBpeRanksCachePath('o200k_base'), JSON.stringify(SAMPLE_RANKS));
      expect(readBpeRanksCache('o200k_base')).toBeUndefined();
    });
  });
});
