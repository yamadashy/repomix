/**
 * Memory utility functions for monitoring memory usage across the application
 */

import { logger, repomixLogLevels } from './logger.js';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsagePercent: number;
}

/**
 * Convert bytes to MB with 2 decimal precision
 */
function bytesToMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

/**
 * Get current memory usage statistics in MB
 */
export function getMemoryStats(): MemoryStats {
  const usage = process.memoryUsage();

  const heapUsed = bytesToMB(usage.heapUsed);
  const heapTotal = bytesToMB(usage.heapTotal);
  const external = bytesToMB(usage.external);
  const rss = bytesToMB(usage.rss);
  const heapUsagePercent = Math.round((heapUsed / heapTotal) * 10000) / 100;

  return {
    heapUsed,
    heapTotal,
    external,
    rss,
    heapUsagePercent,
  };
}

/**
 * Memory figures are only used for trace logging, so skip querying them otherwise
 */
function isTraceEnabled(): boolean {
  return logger.getLogLevel() >= repomixLogLevels.DEBUG;
}

/**
 * Best-effort variant of getMemoryStats: returns undefined instead of throwing.
 * Some runtimes (e.g. Bun on Linux) can fail in process.memoryUsage(), and a
 * diagnostics failure must never abort the pack.
 */
function tryGetMemoryStats(): MemoryStats | undefined {
  try {
    return getMemoryStats();
  } catch {
    return undefined;
  }
}

/**
 * Log memory usage at trace level with a context message
 */
export function logMemoryUsage(context: string): void {
  if (!isTraceEnabled()) {
    return;
  }

  const stats = tryGetMemoryStats();
  if (!stats) {
    logger.trace(`Memory [${context}] | unavailable`);
    return;
  }

  logger.trace(
    `Memory [${context}] | Heap: ${stats.heapUsed}/${stats.heapTotal}MB (${stats.heapUsagePercent}%) | RSS: ${stats.rss}MB | Ext: ${stats.external}MB`,
  );
}

/**
 * Log memory usage difference between two points
 */
export function logMemoryDifference(context: string, before: MemoryStats, after: MemoryStats): void {
  const heapDiff = after.heapUsed - before.heapUsed;
  const rssDiff = after.rss - before.rss;
  const externalDiff = after.external - before.external;

  const formatDiff = (diff: number) => `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;

  logger.trace(
    `Memory [${context} - Delta] | Heap: ${formatDiff(heapDiff)}MB | RSS: ${formatDiff(rssDiff)}MB | Ext: ${formatDiff(externalDiff)}MB`,
  );
}

/**
 * Execute a function and log memory usage before and after
 */
export async function withMemoryLogging<T>(context: string, fn: () => Promise<T>): Promise<T> {
  if (!isTraceEnabled()) {
    return fn();
  }

  const before = tryGetMemoryStats();
  logMemoryUsage(`${context} - Before`);

  try {
    const result = await fn();
    const after = tryGetMemoryStats();
    logMemoryUsage(`${context} - After`);
    if (before && after) {
      logMemoryDifference(context, before, after);
    }
    return result;
  } catch (error) {
    const after = tryGetMemoryStats();
    logMemoryUsage(`${context} - After (Error)`);
    if (before && after) {
      logMemoryDifference(context, before, after);
    }
    throw error;
  }
}
