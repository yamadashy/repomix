import { afterEach, describe, expect, test, vi } from 'vitest';
import { freeTokenCounters, getTokenCounter } from '../../../../src/core/metrics/tokenCounterFactory.js';
import calculateMetricsWorker, {
  onWorkerTermination,
} from '../../../../src/core/metrics/workers/calculateMetricsWorker.js';

vi.mock('../../../../src/core/metrics/tokenCounterFactory.js', () => ({
  getTokenCounter: vi.fn(),
  freeTokenCounters: vi.fn(),
}));
vi.mock('../../../../src/shared/logger.js', () => ({
  logger: { trace: vi.fn(), error: vi.fn() },
  setLogLevelByWorkerData: vi.fn(),
}));

describe('calculateMetricsWorker default export', () => {
  // Pin the items/single-mode dispatch in the worker default export. unifiedWorker
  // mocks the worker module entirely, so this branch is otherwise untested.
  const counter = { countTokens: vi.fn(), free: vi.fn() };

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('single-mode task returns a number from countTokens', async () => {
    counter.countTokens.mockReturnValue(42);
    vi.mocked(getTokenCounter).mockResolvedValue(counter as never);

    const result = await calculateMetricsWorker({ content: 'hello', encoding: 'o200k_base' });

    expect(result).toBe(42);
    expect(counter.countTokens).toHaveBeenCalledWith('hello', undefined);
  });

  test('batch-mode task returns an array, one count per item', async () => {
    counter.countTokens.mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(30);
    vi.mocked(getTokenCounter).mockResolvedValue(counter as never);

    const result = await calculateMetricsWorker({
      items: [{ content: 'a', path: 'a.ts' }, { content: 'bb', path: 'b.ts' }, { content: 'ccc' }],
      encoding: 'o200k_base',
    });

    expect(result).toEqual([10, 20, 30]);
    expect(counter.countTokens).toHaveBeenNthCalledWith(1, 'a', 'a.ts');
    expect(counter.countTokens).toHaveBeenNthCalledWith(2, 'bb', 'b.ts');
    expect(counter.countTokens).toHaveBeenNthCalledWith(3, 'ccc', undefined);
  });

  test('rethrows token counter errors after logging', async () => {
    vi.mocked(getTokenCounter).mockRejectedValue(new Error('encoder load failed'));

    await expect(calculateMetricsWorker({ content: 'x', encoding: 'o200k_base' })).rejects.toThrow(
      'encoder load failed',
    );
  });

  test('onWorkerTermination delegates to freeTokenCounters', async () => {
    await onWorkerTermination();
    expect(freeTokenCounters).toHaveBeenCalled();
  });
});
