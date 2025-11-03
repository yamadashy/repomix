import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { applyLineLimit } from '../../src/core/file/lineLimitProcessor.js';
import {
  DEFAULT_PERFORMANCE_THRESHOLDS,
  generatePerformanceReport,
  measureBaselinePerformance,
  measurePerformance,
  type PerformanceMetrics,
} from './performanceUtils.js';
import { generateLargeFile, generatePerformanceTestCases, type PerformanceTestCase } from './testDataGenerators.js';

describe('Line Limit Performance Tests', () => {
  beforeEach(() => {
    // Mock console methods to reduce noise during performance tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Baseline Performance Tests', () => {
    test('should meet performance requirements for small files (< 100 lines)', async () => {
      const testCases = generatePerformanceTestCases().filter((tc) => tc.lineCount < 100);

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        // Measure performance with line limiting
        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });

        // Check against PRD requirements
        expect(metrics.processingTimeMs).toBeLessThan(testCase.expectedMaxTimeMs);
        expect(metrics.memoryUsageMB).toBeLessThan(testCase.expectedMaxMemoryMB);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(0);
        expect(metrics.memoryEfficiency).toBeGreaterThan(0);

        // Verify line limiting worked correctly
        expect(metrics.linesOutput).toBeLessThanOrEqual(testCase.lineLimit);
        expect(metrics.linesProcessed).toBe(testCase.lineCount);
      }
    });

    test('should meet performance requirements for medium files (100-1000 lines)', async () => {
      const testCases = generatePerformanceTestCases().filter((tc) => tc.lineCount >= 100 && tc.lineCount < 1000);

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });

        expect(metrics.processingTimeMs).toBeLessThan(testCase.expectedMaxTimeMs);
        expect(metrics.memoryUsageMB).toBeLessThan(testCase.expectedMaxMemoryMB);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(0);
        expect(metrics.memoryEfficiency).toBeGreaterThan(0);

        expect(metrics.linesOutput).toBeLessThanOrEqual(testCase.lineLimit);
        expect(metrics.linesProcessed).toBe(testCase.lineCount);
      }
    });

    test('should meet performance requirements for large files (1000-10000 lines)', async () => {
      const testCases = generatePerformanceTestCases().filter((tc) => tc.lineCount >= 1000 && tc.lineCount < 10000);

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });

        expect(metrics.processingTimeMs).toBeLessThan(testCase.expectedMaxTimeMs);
        expect(metrics.memoryUsageMB).toBeLessThan(testCase.expectedMaxMemoryMB);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(0);
        expect(metrics.memoryEfficiency).toBeGreaterThan(0);

        expect(metrics.linesOutput).toBeLessThanOrEqual(testCase.lineLimit);
        expect(metrics.linesProcessed).toBe(testCase.lineCount);
      }
    });

    test('should meet performance requirements for very large files (> 10000 lines)', async () => {
      const testCases = generatePerformanceTestCases()
        .filter((tc) => tc.lineCount >= 10000)
        .slice(0, 2); // Limit to 2 test cases to keep test duration reasonable

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });

        expect(metrics.processingTimeMs).toBeLessThan(testCase.expectedMaxTimeMs);
        expect(metrics.memoryUsageMB).toBeLessThan(testCase.expectedMaxMemoryMB);
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(0);
        expect(metrics.memoryEfficiency).toBeGreaterThan(0);

        expect(metrics.linesOutput).toBeLessThanOrEqual(testCase.lineLimit);
        expect(metrics.linesProcessed).toBe(testCase.lineCount);
      }
    });
  });

  describe('Performance Impact Analysis', () => {
    test('should have less than 5% performance impact compared to baseline', async () => {
      const testCases = generatePerformanceTestCases().slice(0, 5); // Test subset for efficiency

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        // Measure baseline performance (no line limiting)
        const baselineMetrics = await measureBaselinePerformance(
          async () => {
            // Simulate baseline processing (just split lines and count)
            const lines = content.split('\n');
            return {
              originalLineCount: lines.length,
              limitedLineCount: lines.length,
              content,
              truncation: {
                truncated: false,
                originalLineCount: lines.length,
                truncatedLineCount: lines.length,
                lineLimit: lines.length,
              },
            };
          },
          async () => {
            // Measure with line limiting
            return await applyLineLimit(content, filePath, testCase.lineLimit);
          },
        );

        // Check performance impact is within acceptable range
        expect(baselineMetrics.impactPercentage).toBeLessThan(5);
        expect(baselineMetrics.impactPercentage).toBeGreaterThan(-50); // Allow some improvement

        // Log for manual inspection
        console.log(
          `Performance impact for ${testCase.language} (${testCase.lineCount} lines): ${baselineMetrics.impactPercentage.toFixed(2)}%`,
        );
      }
    });

    test('should maintain consistent performance across multiple runs', async () => {
      const testCase = generatePerformanceTestCases()[5]; // Use a medium-sized test case
      const content = generateLargeFile(testCase.language, testCase.lineCount);
      const filePath = `test.${getFileExtension(testCase.language)}`;

      const runMetrics: PerformanceMetrics[] = [];

      // Run the same test multiple times to check consistency
      for (let i = 0; i < 5; i++) {
        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });
        runMetrics.push(metrics);
      }

      // Calculate variance
      const times = runMetrics.map((m) => m.processingTimeMs);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + (time - avgTime) ** 2, 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgTime) * 100;

      // Performance should be consistent (CV < 20%)
      expect(coefficientOfVariation).toBeLessThan(20);

      console.log(`Performance consistency for ${testCase.language}: CV=${coefficientOfVariation.toFixed(2)}%`);
    });
  });

  describe('Memory Efficiency Tests', () => {
    test('should maintain memory efficiency for large files', async () => {
      const largeTestCases = generatePerformanceTestCases()
        .filter((tc) => tc.lineCount >= 5000)
        .slice(0, 3); // Limit to 3 test cases

      for (const testCase of largeTestCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });

        // Memory efficiency should be reasonable (at least 100 lines per MB)
        expect(metrics.memoryEfficiency).toBeGreaterThan(100);

        // Peak memory should not be significantly higher than final memory
        const memoryOverhead = (metrics.peakMemoryUsageMB - metrics.memoryUsageMB) / metrics.memoryUsageMB;
        expect(memoryOverhead).toBeLessThan(0.5); // Less than 50% overhead

        console.log(
          `Memory efficiency for ${testCase.language} (${testCase.lineCount} lines): ${metrics.memoryEfficiency.toFixed(2)} lines/MB`,
        );
      }
    });

    test('should not have memory leaks across multiple operations', async () => {
      const testCase = generatePerformanceTestCases()[3]; // Medium-sized test case
      const content = generateLargeFile(testCase.language, testCase.lineCount);
      const filePath = `test.${getFileExtension(testCase.language)}`;

      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memorySnapshots: number[] = [];

      // Perform multiple operations and track memory
      for (let i = 0; i < 10; i++) {
        await applyLineLimit(content, filePath, testCase.lineLimit);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        memorySnapshots.push(currentMemory);
      }

      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory - initialMemory;
      const maxMemory = Math.max(...memorySnapshots);
      const memoryGrowthPercentage = (memoryGrowth / initialMemory) * 100;

      // Memory growth should be minimal (< 50% growth over initial)
      expect(memoryGrowthPercentage).toBeLessThan(50);

      console.log(`Memory growth after 10 operations: ${memoryGrowthPercentage.toFixed(2)}%`);
    });
  });

  describe('Throughput Tests', () => {
    test('should maintain acceptable throughput for different file sizes', async () => {
      const testCases = generatePerformanceTestCases();

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });

        // Throughput should be reasonable (at least 10 lines per second)
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(10);

        // Larger files should generally have better throughput
        const expectedMinThroughput =
          testCase.lineCount < 100 ? 50 : testCase.lineCount < 1000 ? 100 : testCase.lineCount < 10000 ? 200 : 500;

        expect(metrics.throughputLinesPerSec).toBeGreaterThan(expectedMinThroughput);

        console.log(
          `Throughput for ${testCase.language} (${testCase.lineCount} lines): ${metrics.throughputLinesPerSec.toFixed(2)} lines/sec`,
        );
      }
    });
  });

  describe('Performance Regression Detection', () => {
    test('should generate performance reports for analysis', async () => {
      const testCases = generatePerformanceTestCases().slice(0, 3);
      const fileMetrics: PerformanceMetrics[] = [];

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.lineCount);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.lineLimit);
        });

        fileMetrics.push(metrics);
      }

      const report = generatePerformanceReport(
        'Performance Regression Test',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      // Report should be generated successfully
      expect(report.testCase).toBe('Performance Regression Test');
      expect(report.fileMetrics).toHaveLength(3);
      expect(report.aggregateMetrics.linesProcessed).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);

      // Check if requirements are met
      if (!report.meetsRequirements) {
        console.warn('Performance requirements not met:');
        console.warn(report.warnings.join('\n'));
      }

      // For this test, we expect requirements to be met
      expect(report.meetsRequirements).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small line limits efficiently', async () => {
      const content = generateLargeFile('javascript', 1000);
      const filePath = 'test.js';

      // Test with very small line limits
      const lineLimits = [1, 2, 3, 5, 10];

      for (const lineLimit of lineLimits) {
        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        // Even with small limits, performance should be reasonable
        expect(metrics.processingTimeMs).toBeLessThan(1000); // < 1 second
        expect(metrics.memoryUsageMB).toBeLessThan(20); // < 20MB
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);

        console.log(`Small limit (${lineLimit}) performance: ${metrics.processingTimeMs.toFixed(2)}ms`);
      }
    });

    test('should handle files that do not need limiting efficiently', async () => {
      const content = generateLargeFile('javascript', 50); // Small file
      const filePath = 'test.js';
      const lineLimit = 100; // Limit larger than file

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      // Should be very fast when no limiting is needed
      expect(metrics.processingTimeMs).toBeLessThan(100); // < 100ms
      expect(metrics.memoryUsageMB).toBeLessThan(10); // < 10MB
      expect(metrics.linesOutput).toBe(metrics.linesProcessed); // No truncation

      console.log(`No-limit performance: ${metrics.processingTimeMs.toFixed(2)}ms`);
    });
  });
});

/**
 * Helper function to get file extension for language
 */
function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    go: 'go',
    c: 'c',
    cpp: 'cpp',
    c_sharp: 'cs',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    solidity: 'sol',
    css: 'css',
    vue: 'vue',
    dart: 'dart',
  };

  return extensions[language] || 'txt';
}
