/**
 * Memory utility functions for monitoring memory usage across the application
 */

import { logger } from './logger.js';

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
 * Log memory usage at trace level with a context message.
 * Skips the expensive process.memoryUsage() syscall when trace logging is disabled.
 */
export function logMemoryUsage(context: string): void {
  if (!logger.isTraceEnabled()) return;

  const stats = getMemoryStats();
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
 * Execute a function and log memory usage before and after.
 * When trace logging is disabled, this is a zero-overhead passthrough — it skips
 * the process.memoryUsage() syscalls (~0.3ms each) that would otherwise add up
 * to ~4-8ms across the 10-14 withMemoryLogging calls in a typical pack() run.
 */
export async function withMemoryLogging<T>(context: string, fn: () => Promise<T>): Promise<T> {
  if (!logger.isTraceEnabled()) {
    return fn();
  }

  const before = getMemoryStats();
  logMemoryUsage(`${context} - Before`);

  try {
    const result = await fn();
    const after = getMemoryStats();
    logMemoryUsage(`${context} - After`);
    logMemoryDifference(context, before, after);
    return result;
  } catch (error) {
    const after = getMemoryStats();
    logMemoryUsage(`${context} - After (Error)`);
    logMemoryDifference(context, before, after);
    throw error;
  }
}
