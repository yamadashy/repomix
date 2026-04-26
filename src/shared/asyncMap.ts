/**
 * Maps over `items` asynchronously with a concurrency cap.
 *
 * Behaves like `Promise.all(items.map(fn))` except at most `concurrency`
 * invocations of `fn` are in flight at once. The returned array preserves the
 * original input order regardless of completion order.
 *
 * Bounds resource usage (file descriptors, sockets, memory) when mapping over
 * large arrays — `Promise.all` alone has no upper bound and can exhaust them.
 *
 * Rejection semantics match `Promise.all`: the first rejection propagates, and
 * already-started tasks continue running but their results are discarded. Note
 * that workers are not cooperatively cancelled — sibling workers will keep
 * claiming new indices and starting tasks until `items` is exhausted.
 */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`concurrency must be a positive integer (received ${concurrency})`);
  }

  if (items.length === 0) {
    return [];
  }

  const results: R[] = Array.from({ length: items.length });
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
};
