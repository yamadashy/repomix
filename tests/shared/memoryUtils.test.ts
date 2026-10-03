import { afterEach, describe, expect, test, vi } from 'vitest';
import { logger } from '../../src/shared/logger.js';
import {
  getMemoryStats,
  logMemoryDifference,
  logMemoryUsage,
  withMemoryLogging,
} from '../../src/shared/memoryUtils.js';

vi.mock('../../src/shared/logger', () => ({
  logger: {
    trace: vi.fn(),
  },
}));

describe('memoryUtils', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('getMemoryStats returns numeric MB values and a heap percentage', () => {
    const stats = getMemoryStats();
    // Sanity bounds — these would catch unit-conversion regressions
    // (e.g., returning bytes instead of MB) that `expect.any(Number)` misses.
    expect(stats.heapTotal).toBeGreaterThan(0);
    expect(stats.rss).toBeGreaterThan(0);
    expect(stats.heapUsed).toBeGreaterThan(0);
    expect(stats.heapUsed).toBeLessThanOrEqual(stats.heapTotal);
    expect(stats.external).toBeGreaterThanOrEqual(0);
    expect(stats.heapUsagePercent).toBeGreaterThanOrEqual(0);
    expect(stats.heapUsagePercent).toBeLessThanOrEqual(100);
  });

  test('getMemoryStats degrades to zeros when process.memoryUsage throws (denied /proc under a sandbox)', () => {
    const spy = vi.spyOn(process, 'memoryUsage').mockImplementation((() => {
      throw Object.assign(new Error('EACCES: permission denied, uv_resident_set_memory'), { code: 'EACCES' });
    }) as unknown as typeof process.memoryUsage);
    try {
      // Must not throw — memory stats are diagnostics; a denied /proc read cannot be
      // allowed to abort the operation being measured (e.g. a pack under --sandbox-strict).
      expect(getMemoryStats()).toEqual({ heapUsed: 0, heapTotal: 0, external: 0, rss: 0, heapUsagePercent: 0 });
      expect(() => logMemoryUsage('sandboxed')).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  test('logMemoryUsage emits a trace line tagged with context', () => {
    logMemoryUsage('parse');
    expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Memory [parse]'));
  });

  test('logMemoryDifference formats positive and negative deltas with sign', () => {
    const before = { heapUsed: 10, heapTotal: 20, external: 1, rss: 50, heapUsagePercent: 50 };
    const after = { heapUsed: 15, heapTotal: 20, external: 0, rss: 48, heapUsagePercent: 75 };

    logMemoryDifference('parse', before, after);

    const message = (logger.trace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(message).toContain('+5.00MB'); // heap diff
    expect(message).toContain('-2.00MB'); // rss diff
    expect(message).toContain('-1.00MB'); // external diff
  });

  test('withMemoryLogging returns the inner result on success', async () => {
    const result = await withMemoryLogging('task', async () => 'ok');
    expect(result).toBe('ok');
    // Before, After, Delta — three trace lines.
    expect(logger.trace).toHaveBeenCalledTimes(3);
  });

  test('withMemoryLogging rethrows but still logs After (Error)', async () => {
    const boom = new Error('boom');

    await expect(
      withMemoryLogging('task', async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);

    const messages = (logger.trace as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('After (Error)'))).toBe(true);
  });
});
