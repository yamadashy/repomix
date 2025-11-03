import { performance } from 'node:perf_hooks';
import type { SupportedLang } from '../../src/core/treeSitter/lang2Query.js';

/**
 * Performance measurement utilities
 */

export interface PerformanceMetrics {
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Peak memory usage in MB */
  peakMemoryUsageMB: number;
  /** Number of lines processed */
  linesProcessed: number;
  /** Number of lines after limiting */
  linesOutput: number;
  /** Line limit applied */
  lineLimit: number;
  /** Language being processed */
  language: SupportedLang;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Processing throughput (lines per second) */
  throughputLinesPerSec: number;
  /** Memory efficiency (lines per MB) */
  memoryEfficiency: number;
  /** Performance impact percentage (compared to baseline) */
  performanceImpactPercentage?: number;
}

export interface BaselineMetrics {
  /** Baseline processing time without line limiting */
  baselineTimeMs: number;
  /** Baseline memory usage without line limiting */
  baselineMemoryMB: number;
  /** Processing time with line limiting */
  limitedTimeMs: number;
  /** Memory usage with line limiting */
  limitedMemoryMB: number;
  /** Performance impact percentage */
  impactPercentage: number;
}

export interface PerformanceReport {
  /** Test case identifier */
  testCase: string;
  /** Individual file metrics */
  fileMetrics: PerformanceMetrics[];
  /** Aggregate metrics */
  aggregateMetrics: PerformanceMetrics;
  /** Baseline comparison */
  baselineComparison?: BaselineMetrics;
  /** Performance requirements check */
  meetsRequirements: boolean;
  /** Performance warnings */
  warnings: string[];
  /** Test timestamp */
  timestamp: Date;
}

export interface PerformanceThresholds {
  /** Maximum processing time for small files (< 100 lines) in ms */
  smallFileMaxTimeMs: number;
  /** Maximum processing time for medium files (100-1000 lines) in ms */
  mediumFileMaxTimeMs: number;
  /** Maximum processing time for large files (1000-10000 lines) in ms */
  largeFileMaxTimeMs: number;
  /** Maximum processing time for very large files (> 10000 lines) in ms */
  veryLargeFileMaxTimeMs: number;
  /** Maximum performance impact percentage */
  maxPerformanceImpactPercentage: number;
  /** Maximum memory usage for small files in MB */
  smallFileMaxMemoryMB: number;
  /** Maximum memory usage for medium files in MB */
  mediumFileMaxMemoryMB: number;
  /** Maximum memory usage for large files in MB */
  largeFileMaxMemoryMB: number;
  /** Maximum memory usage for very large files in MB */
  veryLargeFileMaxMemoryMB: number;
}

/**
 * Default performance thresholds based on PRD requirements
 */
export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  smallFileMaxTimeMs: 1000, // < 1 second for small files
  mediumFileMaxTimeMs: 10000, // < 10 seconds for medium files
  largeFileMaxTimeMs: 100000, // < 100 seconds for large files
  veryLargeFileMaxTimeMs: 500000, // < 500 seconds for very large files
  maxPerformanceImpactPercentage: 5, // < 5% performance impact
  smallFileMaxMemoryMB: 10,
  mediumFileMaxMemoryMB: 20,
  largeFileMaxMemoryMB: 50,
  veryLargeFileMaxMemoryMB: 100,
};

/**
 * Performance measurement class
 */
export class PerformanceMeasurement {
  private startTime: number = 0;
  private startMemory: number = 0;
  private peakMemory: number = 0;
  private measurements: number[] = [];

  /**
   * Start performance measurement
   */
  start(): void {
    this.startTime = performance.now();
    this.startMemory = this.getMemoryUsage();
    this.peakMemory = this.startMemory;
  }

  /**
   * Record intermediate measurement
   */
  record(): void {
    const currentMemory = this.getMemoryUsage();
    this.peakMemory = Math.max(this.peakMemory, currentMemory);
    this.measurements.push(performance.now() - this.startTime);
  }

  /**
   * Stop measurement and return metrics
   */
  stop(): { timeMs: number; memoryMB: number; peakMemoryMB: number } {
    const endTime = performance.now();
    const timeMs = endTime - this.startTime;
    const finalMemory = this.getMemoryUsage();
    const peakMemoryMB = Math.max(this.peakMemory, finalMemory);

    return {
      timeMs,
      memoryMB: finalMemory,
      peakMemoryMB,
    };
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024;
  }

  /**
   * Get intermediate measurements
   */
  getMeasurements(): number[] {
    return [...this.measurements];
  }
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  fn: () => Promise<T> | T,
  recordInterval?: number,
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const measurement = new PerformanceMeasurement();
  measurement.start();

  try {
    const result = await fn();

    // Record intermediate measurements if interval is specified
    if (recordInterval) {
      const interval = setInterval(() => {
        measurement.record();
      }, recordInterval);

      // Clear interval when function completes
      setTimeout(() => clearInterval(interval), 0);
    }

    const { timeMs, memoryMB, peakMemoryMB } = measurement.stop();

    // Extract basic metrics from result if available
    let linesProcessed = 0;
    let linesOutput = 0;
    let lineLimit = 0;
    let language: SupportedLang = 'javascript';
    const fileSizeBytes = 0;

    // Try to extract metrics from result if it's a line limit result
    if (result && typeof result === 'object') {
      if ('originalLineCount' in result) {
        linesProcessed = (result as any).originalLineCount;
      }
      if ('limitedLineCount' in result) {
        linesOutput = (result as any).limitedLineCount;
      }
      if ('metadata' in result && (result as any).metadata?.lineLimit) {
        lineLimit = (result as any).metadata.lineLimit;
      }
      if ('metadata' in result && (result as any).metadata?.language) {
        language = (result as any).metadata.language;
      }
    }

    // Calculate derived metrics
    const throughputLinesPerSec = linesProcessed > 0 ? (linesProcessed / timeMs) * 1000 : 0;
    const memoryEfficiency = memoryMB > 0 ? linesProcessed / memoryMB : 0;

    const metrics: PerformanceMetrics = {
      processingTimeMs: timeMs,
      memoryUsageMB: memoryMB,
      peakMemoryUsageMB: peakMemoryMB,
      linesProcessed,
      linesOutput,
      lineLimit,
      language,
      fileSizeBytes,
      throughputLinesPerSec,
      memoryEfficiency,
    };

    return { result, metrics };
  } catch (error) {
    measurement.stop();
    throw error;
  }
}

/**
 * Measure baseline vs line limiting performance
 */
export async function measureBaselinePerformance<T>(
  baselineFn: () => Promise<T> | T,
  limitedFn: () => Promise<T> | T,
): Promise<BaselineMetrics> {
  // Measure baseline performance
  const baselineMeasurement = new PerformanceMeasurement();
  baselineMeasurement.start();
  await baselineFn();
  const { timeMs: baselineTimeMs, memoryMB: baselineMemoryMB } = baselineMeasurement.stop();

  // Measure limited performance
  const limitedMeasurement = new PerformanceMeasurement();
  limitedMeasurement.start();
  await limitedFn();
  const { timeMs: limitedTimeMs, memoryMB: limitedMemoryMB } = limitedMeasurement.stop();

  // Calculate performance impact
  const impactPercentage = baselineTimeMs > 0 ? ((limitedTimeMs - baselineTimeMs) / baselineTimeMs) * 100 : 0;

  return {
    baselineTimeMs,
    baselineMemoryMB,
    limitedTimeMs,
    limitedMemoryMB,
    impactPercentage,
  };
}

/**
 * Check if performance meets requirements
 */
export function checkPerformanceRequirements(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds = DEFAULT_PERFORMANCE_THRESHOLDS,
): { meetsRequirements: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let meetsRequirements = true;

  // Check processing time based on file size
  const lineCount = metrics.linesProcessed;
  let maxTimeMs: number;
  let maxMemoryMB: number;

  if (lineCount < 100) {
    maxTimeMs = thresholds.smallFileMaxTimeMs;
    maxMemoryMB = thresholds.smallFileMaxMemoryMB;
  } else if (lineCount < 1000) {
    maxTimeMs = thresholds.mediumFileMaxTimeMs;
    maxMemoryMB = thresholds.mediumFileMaxMemoryMB;
  } else if (lineCount < 10000) {
    maxTimeMs = thresholds.largeFileMaxTimeMs;
    maxMemoryMB = thresholds.largeFileMaxMemoryMB;
  } else {
    maxTimeMs = thresholds.veryLargeFileMaxTimeMs;
    maxMemoryMB = thresholds.veryLargeFileMaxMemoryMB;
  }

  if (metrics.processingTimeMs > maxTimeMs) {
    warnings.push(
      `Processing time ${metrics.processingTimeMs}ms exceeds maximum ${maxTimeMs}ms for ${lineCount} lines`,
    );
    meetsRequirements = false;
  }

  if (metrics.memoryUsageMB > maxMemoryMB) {
    warnings.push(`Memory usage ${metrics.memoryUsageMB}MB exceeds maximum ${maxMemoryMB}MB for ${lineCount} lines`);
    meetsRequirements = false;
  }

  // Check performance impact if available
  if (
    metrics.performanceImpactPercentage &&
    metrics.performanceImpactPercentage > thresholds.maxPerformanceImpactPercentage
  ) {
    warnings.push(
      `Performance impact ${metrics.performanceImpactPercentage}% exceeds maximum ${thresholds.maxPerformanceImpactPercentage}%`,
    );
    meetsRequirements = false;
  }

  return { meetsRequirements, warnings };
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  testCase: string,
  fileMetrics: PerformanceMetrics[],
  baselineComparison?: BaselineMetrics,
  thresholds: PerformanceThresholds = DEFAULT_PERFORMANCE_THRESHOLDS,
): PerformanceReport {
  // Calculate aggregate metrics
  const aggregateMetrics: PerformanceMetrics = {
    processingTimeMs: fileMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0),
    memoryUsageMB: fileMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0),
    peakMemoryUsageMB: Math.max(...fileMetrics.map((m) => m.peakMemoryUsageMB)),
    linesProcessed: fileMetrics.reduce((sum, m) => sum + m.linesProcessed, 0),
    linesOutput: fileMetrics.reduce((sum, m) => sum + m.linesOutput, 0),
    lineLimit: fileMetrics[0]?.lineLimit || 0,
    language: fileMetrics[0]?.language || 'javascript',
    fileSizeBytes: fileMetrics.reduce((sum, m) => sum + m.fileSizeBytes, 0),
    throughputLinesPerSec: 0, // Will be calculated below
    memoryEfficiency: 0, // Will be calculated below
  };

  // Calculate derived aggregate metrics
  if (aggregateMetrics.processingTimeMs > 0) {
    aggregateMetrics.throughputLinesPerSec =
      (aggregateMetrics.linesProcessed / aggregateMetrics.processingTimeMs) * 1000;
  }
  if (aggregateMetrics.memoryUsageMB > 0) {
    aggregateMetrics.memoryEfficiency = aggregateMetrics.linesProcessed / aggregateMetrics.memoryUsageMB;
  }

  // Check performance requirements for all files
  const allWarnings: string[] = [];
  let meetsRequirements = true;

  for (const metrics of fileMetrics) {
    const { warnings, meetsRequirements: fileMeetsRequirements } = checkPerformanceRequirements(metrics, thresholds);

    allWarnings.push(...warnings);
    if (!fileMeetsRequirements) {
      meetsRequirements = false;
    }
  }

  // Add baseline comparison warnings
  if (baselineComparison && baselineComparison.impactPercentage > thresholds.maxPerformanceImpactPercentage) {
    allWarnings.push(
      `Baseline performance impact ${baselineComparison.impactPercentage}% exceeds maximum ${thresholds.maxPerformanceImpactPercentage}%`,
    );
    meetsRequirements = false;
  }

  return {
    testCase,
    fileMetrics,
    aggregateMetrics,
    baselineComparison,
    meetsRequirements,
    warnings: allWarnings,
    timestamp: new Date(),
  };
}

/**
 * Format performance metrics for display
 */
export function formatMetrics(metrics: PerformanceMetrics): string {
  return [
    `Processing Time: ${metrics.processingTimeMs.toFixed(2)}ms`,
    `Memory Usage: ${metrics.memoryUsageMB.toFixed(2)}MB`,
    `Peak Memory: ${metrics.peakMemoryUsageMB.toFixed(2)}MB`,
    `Lines Processed: ${metrics.linesProcessed}`,
    `Lines Output: ${metrics.linesOutput}`,
    `Line Limit: ${metrics.lineLimit}`,
    `Language: ${metrics.language}`,
    `File Size: ${(metrics.fileSizeBytes / 1024).toFixed(2)}KB`,
    `Throughput: ${metrics.throughputLinesPerSec.toFixed(2)} lines/sec`,
    `Memory Efficiency: ${metrics.memoryEfficiency.toFixed(2)} lines/MB`,
    metrics.performanceImpactPercentage ? `Performance Impact: ${metrics.performanceImpactPercentage.toFixed(2)}%` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Format performance report for display
 */
export function formatReport(report: PerformanceReport): string {
  const sections = [
    `Performance Report: ${report.testCase}`,
    `Generated: ${report.timestamp.toISOString()}`,
    `Status: ${report.meetsRequirements ? '✅ PASS' : '❌ FAIL'}`,
    '',
    'Aggregate Metrics:',
    formatMetrics(report.aggregateMetrics),
    '',
  ];

  if (report.baselineComparison) {
    sections.push(
      'Baseline Comparison:',
      `  Baseline Time: ${report.baselineComparison.baselineTimeMs.toFixed(2)}ms`,
      `  Limited Time: ${report.baselineComparison.limitedTimeMs.toFixed(2)}ms`,
      `  Performance Impact: ${report.baselineComparison.impactPercentage.toFixed(2)}%`,
      '',
    );
  }

  if (report.fileMetrics.length > 1) {
    sections.push('Individual File Metrics:');
    report.fileMetrics.forEach((metrics, index) => {
      sections.push(`  File ${index + 1}:`);
      formatMetrics(metrics)
        .split('\n')
        .forEach((line) => {
          sections.push(`    ${line}`);
        });
      sections.push('');
    });
  }

  if (report.warnings.length > 0) {
    sections.push('Warnings:');
    report.warnings.forEach((warning) => {
      sections.push(`  ⚠️  ${warning}`);
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Save performance report to file
 */
export async function saveReport(report: PerformanceReport, filePath: string): Promise<void> {
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, formatReport(report), 'utf-8');
}

/**
 * Load performance report from file
 */
export async function loadReport(filePath: string): Promise<PerformanceReport> {
  const fs = await import('node:fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');

  // This is a simplified implementation - in a real scenario,
  // you'd want to parse the structured data
  throw new Error('Report loading not implemented - use structured JSON format instead');
}

/**
 * Compare two performance reports
 */
export function compareReports(
  report1: PerformanceReport,
  report2: PerformanceReport,
): {
  timeDifference: number;
  memoryDifference: number;
  throughputDifference: number;
  regression: boolean;
} {
  const timeDifference =
    ((report2.aggregateMetrics.processingTimeMs - report1.aggregateMetrics.processingTimeMs) /
      report1.aggregateMetrics.processingTimeMs) *
    100;

  const memoryDifference =
    ((report2.aggregateMetrics.memoryUsageMB - report1.aggregateMetrics.memoryUsageMB) /
      report1.aggregateMetrics.memoryUsageMB) *
    100;

  const throughputDifference =
    ((report2.aggregateMetrics.throughputLinesPerSec - report1.aggregateMetrics.throughputLinesPerSec) /
      report1.aggregateMetrics.throughputLinesPerSec) *
    100;

  // Consider it a regression if performance degrades by more than 10%
  const regression = timeDifference > 10 || memoryDifference > 10 || throughputDifference < -10;

  return {
    timeDifference,
    memoryDifference,
    throughputDifference,
    regression,
  };
}
