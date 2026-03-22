/**
 * Run async tasks with a concurrency limit.
 * Results are returned in the same order as the input items.
 */
export const promisePool = async <T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = Array.from({ length: items.length });
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results;
};
