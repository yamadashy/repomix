import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getTokenCounter } from '../../../../src/core/metrics/tokenCounterFactory.js';
import calculateMetricsWorker, {
  onWorkerTermination,
} from '../../../../src/core/metrics/workers/calculateMetricsWorker.js';
import { silenceLogger } from '../../../testing/loggerDoubles.js';

describe('calculateMetricsWorker default export', () => {
  // Pin the items/single-mode dispatch in the worker default export. unifiedWorker
  // mocks the worker module entirely, so this branch is otherwise untested.
  const counter = { countTokens: vi.fn(), free: vi.fn() };
  const mockGetTokenCounter = vi.fn();
  const deps = { getTokenCounter: mockGetTokenCounter };

  beforeEach(() => {
    silenceLogger();
  });

  test('single-mode task returns a number from countTokens', async () => {
    counter.countTokens.mockReturnValue(42);
    mockGetTokenCounter.mockResolvedValue(counter);

    const result = await calculateMetricsWorker({ content: 'hello', encoding: 'o200k_base' }, deps);

    expect(result).toBe(42);
    expect(counter.countTokens).toHaveBeenCalledWith('hello', undefined);
  });

  test('batch-mode task returns an array, one count per item', async () => {
    counter.countTokens.mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(30);
    mockGetTokenCounter.mockResolvedValue(counter);

    const result = await calculateMetricsWorker(
      {
        items: [{ content: 'a', path: 'a.ts' }, { content: 'bb', path: 'b.ts' }, { content: 'ccc' }],
        encoding: 'o200k_base',
      },
      deps,
    );

    expect(result).toEqual([10, 20, 30]);
    expect(counter.countTokens).toHaveBeenNthCalledWith(1, 'a', 'a.ts');
    expect(counter.countTokens).toHaveBeenNthCalledWith(2, 'bb', 'b.ts');
    expect(counter.countTokens).toHaveBeenNthCalledWith(3, 'ccc', undefined);
  });

  test('rethrows token counter errors after logging', async () => {
    mockGetTokenCounter.mockRejectedValue(new Error('encoder load failed'));

    await expect(calculateMetricsWorker({ content: 'x', encoding: 'o200k_base' }, deps)).rejects.toThrow(
      'encoder load failed',
    );
  });

  test('onWorkerTermination frees the cached token counters', async () => {
    // Tinypool invokes the teardown with a placeholder task argument, so
    // onWorkerTermination takes no deps; exercise the real factory cache instead.
    const cachedCounter = await getTokenCounter('o200k_base');
    const freeSpy = vi.spyOn(cachedCounter, 'free');

    await onWorkerTermination();

    expect(freeSpy).toHaveBeenCalled();
    // The cache was cleared, so the next lookup builds a fresh counter.
    expect(await getTokenCounter('o200k_base')).not.toBe(cachedCounter);
  });
});
