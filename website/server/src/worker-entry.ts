/**
 * Minimal worker entry point for bundled environment
 *
 * This file serves as a lightweight entry point for tinypool workers.
 * It only exports the unified worker handler, without including server dependencies
 * (Hono, winston, etc.)
 *
 * This significantly reduces the bundle size for workers, improving:
 * - Worker startup time
 * - Memory usage per worker
 * - CPU usage during worker initialization
 */

export { unifiedWorkerHandler as default, unifiedWorkerTermination as onWorkerTermination } from 'repomix';
