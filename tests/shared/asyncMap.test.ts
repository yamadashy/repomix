import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from '../../src/shared/asyncMap.js';

describe('mapWithConcurrency', () => {
  it('returns results in input order regardless of completion order', async () => {
    const items = [10, 50, 30, 5, 40];
    const result = await mapWithConcurrency(items, 3, async (n) => {
      await new Promise((resolve) => setTimeout(resolve, n));
      return n * 2;
    });
    expect(result).toEqual([20, 100, 60, 10, 80]);
  });

  it('passes the index to the mapper', async () => {
    const result = await mapWithConcurrency(['a', 'b', 'c'], 2, async (item, index) => `${index}:${item}`);
    expect(result).toEqual(['0:a', '1:b', '2:c']);
  });

  it('caps in-flight tasks at the concurrency limit', async () => {
    let active = 0;
    let peakActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);

    await mapWithConcurrency(items, 4, async (n) => {
      active++;
      peakActive = Math.max(peakActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return n;
    });

    // All `concurrency` workers are spawned synchronously via Promise.all and each
    // runs up to its first await before any timer resolves, so peak hits the cap exactly.
    expect(peakActive).toBe(4);
  });

  it('returns an empty array for empty input without invoking fn', async () => {
    let called = false;
    const result = await mapWithConcurrency([], 4, async () => {
      called = true;
      return 1;
    });
    expect(result).toEqual([]);
    expect(called).toBe(false);
  });

  it('handles concurrency greater than item count', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 100, async (n) => n + 1);
    expect(result).toEqual([2, 3, 4]);
  });

  it('propagates the first rejection', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });

  it('throws on non-positive concurrency', async () => {
    await expect(mapWithConcurrency([1], 0, async (n) => n)).rejects.toThrow(/positive integer/);
    await expect(mapWithConcurrency([1], -1, async (n) => n)).rejects.toThrow(/positive integer/);
    await expect(mapWithConcurrency([1], 1.5, async (n) => n)).rejects.toThrow(/positive integer/);
  });
});
