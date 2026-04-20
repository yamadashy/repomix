/**
 * Task-count estimate passed to `createMetricsTaskRunner` before the real
 * file count is known. Batch-size tuning in `calculateFileMetrics` queries
 * the same value so the batch count stays in step with the pool's
 * `maxThreads`.
 */
export const METRICS_POOL_SIZING_ESTIMATE = 400;
