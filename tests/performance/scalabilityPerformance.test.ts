import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { applyLineLimit } from '../../src/core/file/lineLimitProcessor.js';
import type { SupportedLang as SupportedLangType } from '../../src/core/treeSitter/lang2Query.js';
import {
  DEFAULT_PERFORMANCE_THRESHOLDS,
  generatePerformanceReport,
  measureBaselinePerformance,
  measurePerformance,
  type PerformanceMetrics,
} from './performanceUtils.js';
import { type GeneratedFile, generateFileSet, generateLargeFile, type SupportedLang } from './testDataGenerators.js';

describe('Scalability Performance Tests', () => {
  beforeEach(() => {
    // Mock console methods to reduce noise during performance tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Single Large File Processing', () => {
    test('should handle very large single files efficiently', async () => {
      const largeFileSizes = [10000, 25000, 50000];
      const language: SupportedLangType = 'javascript';
      const lineLimit = 1000;
      const fileMetrics: PerformanceMetrics[] = [];

      for (const size of largeFileSizes) {
        const content = generateLargeFile(language, size);
        const filePath = `large-${size}.js`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        fileMetrics.push(metrics);

        // Performance should scale reasonably
        const expectedMaxTime = size * 0.5; // 0.5ms per line as baseline
        expect(metrics.processingTimeMs).toBeLessThan(expectedMaxTime);
        expect(metrics.memoryUsageMB).toBeLessThan(200); // Reasonable memory limit
        expect(metrics.throughputLinesPerSec).toBeGreaterThan(20);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);

        console.log(
          `Single large file (${size} lines): ${metrics.processingTimeMs.toFixed(2)}ms, ${metrics.memoryUsageMB.toFixed(2)}MB`,
        );
      }

      // Check that performance scales linearly or sub-linearly
      const times = fileMetrics.map((m) => m.processingTimeMs);
      const sizes = largeFileSizes;

      // Calculate scaling factor between consecutive sizes
      const scalingFactors: number[] = [];
      for (let i = 1; i < times.length; i++) {
        const sizeRatio = sizes[i] / sizes[i - 1];
        const timeRatio = times[i] / times[i - 1];
        scalingFactors.push(timeRatio / sizeRatio);
      }

      const avgScalingFactor = scalingFactors.reduce((sum, factor) => sum + factor, 0) / scalingFactors.length;
      expect(avgScalingFactor).toBeLessThan(1.2); // Less than 20% overhead over linear scaling

      console.log(`Average scaling factor: ${avgScalingFactor.toFixed(2)}`);
    });
  });

  describe('Multiple Large Files Processing', () => {
    test('should handle multiple large files efficiently', async () => {
      const fileCounts = [5, 10, 25];
      const language: SupportedLangType = 'python';
      const linesPerFile = 2000;
      const lineLimit = 200;
      const scalabilityMetrics: PerformanceMetrics[] = [];

      for (const count of fileCounts) {
        const files = generateFileSet(count, language, linesPerFile);
        const fileMetrics: PerformanceMetrics[] = [];

        // Process files sequentially
        const startTime = Date.now();
        for (const file of files) {
          const { metrics } = await measurePerformance(async () => {
            return await applyLineLimit(file.content, file.filePath, lineLimit);
          });
          fileMetrics.push(metrics);
        }
        const totalTime = Date.now() - startTime;

        // Calculate aggregate metrics
        const aggregateMetrics: PerformanceMetrics = {
          processingTimeMs: totalTime,
          memoryUsageMB: fileMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0),
          peakMemoryUsageMB: Math.max(...fileMetrics.map((m) => m.peakMemoryUsageMB)),
          linesProcessed: fileMetrics.reduce((sum, m) => sum + m.linesProcessed, 0),
          linesOutput: fileMetrics.reduce((sum, m) => sum + m.linesOutput, 0),
          lineLimit,
          language,
          fileSizeBytes: fileMetrics.reduce((sum, m) => sum + m.fileSizeBytes, 0),
          throughputLinesPerSec: 0,
          memoryEfficiency: 0,
        };

        // Calculate derived metrics
        if (totalTime > 0) {
          aggregateMetrics.throughputLinesPerSec = (aggregateMetrics.linesProcessed / totalTime) * 1000;
        }
        if (aggregateMetrics.memoryUsageMB > 0) {
          aggregateMetrics.memoryEfficiency = aggregateMetrics.linesProcessed / aggregateMetrics.memoryUsageMB;
        }

        scalabilityMetrics.push(aggregateMetrics);

        // Performance should be reasonable for multiple files
        const expectedMaxTime = count * linesPerFile * 0.3; // 0.3ms per line average
        expect(aggregateMetrics.processingTimeMs).toBeLessThan(expectedMaxTime);
        expect(aggregateMetrics.memoryUsageMB).toBeLessThan(count * 50); // 50MB per file max
        expect(aggregateMetrics.throughputLinesPerSec).toBeGreaterThan(50);

        console.log(
          `Multiple files (${count}x${linesPerFile}): ${totalTime}ms total, ${(totalTime / count).toFixed(2)}ms avg per file`,
        );
      }

      // Check that processing time scales linearly with file count
      const times = scalabilityMetrics.map((m) => m.processingTimeMs);
      const counts = fileCounts;

      const scalingFactors: number[] = [];
      for (let i = 1; i < times.length; i++) {
        const countRatio = counts[i] / counts[i - 1];
        const timeRatio = times[i] / times[i - 1];
        scalingFactors.push(timeRatio / countRatio);
      }

      const avgScalingFactor = scalingFactors.reduce((sum, factor) => sum + factor, 0) / scalingFactors.length;
      expect(avgScalingFactor).toBeLessThan(1.3); // Less than 30% overhead over linear scaling

      console.log(`Multiple files scaling factor: ${avgScalingFactor.toFixed(2)}`);
    });

    test('should handle concurrent processing efficiently', async () => {
      const fileCount = 10;
      const language: SupportedLangType = 'typescript';
      const linesPerFile = 1000;
      const lineLimit = 100;
      const files = generateFileSet(fileCount, language, linesPerFile);

      // Process files concurrently
      const startTime = Date.now();
      const concurrentPromises = files.map(async (file) => {
        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(file.content, file.filePath, lineLimit);
        });
        return metrics;
      });

      const fileMetrics = await Promise.all(concurrentPromises);
      const totalTime = Date.now() - startTime;

      // Calculate aggregate metrics
      const aggregateMetrics: PerformanceMetrics = {
        processingTimeMs: totalTime,
        memoryUsageMB: fileMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0),
        peakMemoryUsageMB: Math.max(...fileMetrics.map((m) => m.peakMemoryUsageMB)),
        linesProcessed: fileMetrics.reduce((sum, m) => sum + m.linesProcessed, 0),
        linesOutput: fileMetrics.reduce((sum, m) => sum + m.linesOutput, 0),
        lineLimit,
        language,
        fileSizeBytes: fileMetrics.reduce((sum, m) => sum + m.fileSizeBytes, 0),
        throughputLinesPerSec: 0,
        memoryEfficiency: 0,
      };

      // Calculate derived metrics
      if (totalTime > 0) {
        aggregateMetrics.throughputLinesPerSec = (aggregateMetrics.linesProcessed / totalTime) * 1000;
      }
      if (aggregateMetrics.memoryUsageMB > 0) {
        aggregateMetrics.memoryEfficiency = aggregateMetrics.linesProcessed / aggregateMetrics.memoryUsageMB;
      }

      // Concurrent processing should be faster than sequential
      const expectedSequentialTime = fileCount * linesPerFile * 0.5; // Estimated sequential time
      expect(totalTime).toBeLessThan(expectedSequentialTime * 0.8); // At least 20% faster

      // Memory usage should be reasonable for concurrent processing
      expect(aggregateMetrics.memoryUsageMB).toBeLessThan(fileCount * 30); // Less memory due to sharing
      expect(aggregateMetrics.peakMemoryUsageMB).toBeLessThan(300); // Reasonable peak memory

      console.log(`Concurrent processing (${fileCount} files): ${totalTime}ms total`);
      console.log(`Throughput: ${aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec`);
    });
  });

  describe('Mixed Repository Processing', () => {
    test('should handle realistic mixed repository efficiently', async () => {
      // Create a realistic mixed repository structure
      const mixedFiles: GeneratedFile[] = [
        // JavaScript files
        ...generateFileSet(3, 'javascript', 1500),
        ...generateFileSet(2, 'javascript', 500),

        // TypeScript files
        ...generateFileSet(2, 'typescript', 2000),
        ...generateFileSet(1, 'typescript', 800),

        // Python files
        ...generateFileSet(2, 'python', 1800),
        ...generateFileSet(1, 'python', 600),

        // Java files
        ...generateFileSet(1, 'java', 2500),
        ...generateFileSet(1, 'java', 1200),

        // Go files
        ...generateFileSet(1, 'go', 1600),
        ...generateFileSet(1, 'go', 700),

        // Configuration files
        {
          content: JSON.stringify(
            {
              name: 'test-project',
              version: '1.0.0',
              scripts: {
                start: 'node index.js',
                test: 'jest',
                build: 'webpack',
              },
              dependencies: {
                react: '^18.0.0',
                'react-dom': '^18.0.0',
                express: '^4.18.0',
              },
            },
            null,
            2,
          ),
          filePath: 'package.json',
          language: 'javascript',
          actualLineCount: 20,
        },
        {
          content: `
# Test Project Configuration

## Environment Variables
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/testdb

## Build Configuration
WEBPACK_MODE=development
BABEL_ENV=development
          `.trim(),
          filePath: '.env',
          language: 'javascript',
          actualLineCount: 10,
        },
      ];

      const lineLimit = 150;
      const fileMetrics: PerformanceMetrics[] = [];

      // Process all files
      const startTime = Date.now();
      for (const file of mixedFiles) {
        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(file.content, file.filePath, lineLimit);
        });
        fileMetrics.push(metrics);
      }
      const totalTime = Date.now() - startTime;

      // Calculate aggregate metrics
      const aggregateMetrics: PerformanceMetrics = {
        processingTimeMs: totalTime,
        memoryUsageMB: fileMetrics.reduce((sum, m) => sum + m.memoryUsageMB, 0),
        peakMemoryUsageMB: Math.max(...fileMetrics.map((m) => m.peakMemoryUsageMB)),
        linesProcessed: fileMetrics.reduce((sum, m) => sum + m.linesProcessed, 0),
        linesOutput: fileMetrics.reduce((sum, m) => sum + m.linesOutput, 0),
        lineLimit,
        language: 'javascript', // Primary language
        fileSizeBytes: fileMetrics.reduce((sum, m) => sum + m.fileSizeBytes, 0),
        throughputLinesPerSec: 0,
        memoryEfficiency: 0,
      };

      // Calculate derived metrics
      if (totalTime > 0) {
        aggregateMetrics.throughputLinesPerSec = (aggregateMetrics.linesProcessed / totalTime) * 1000;
      }
      if (aggregateMetrics.memoryUsageMB > 0) {
        aggregateMetrics.memoryEfficiency = aggregateMetrics.linesProcessed / aggregateMetrics.memoryUsageMB;
      }

      // Performance should be reasonable for mixed repository
      const totalLines = aggregateMetrics.linesProcessed;
      expect(totalTime).toBeLessThan(totalLines * 0.2); // Less than 0.2ms per line average
      expect(aggregateMetrics.memoryUsageMB).toBeLessThan(500); // Reasonable total memory
      expect(aggregateMetrics.throughputLinesPerSec).toBeGreaterThan(100);

      // Generate performance report
      const report = generatePerformanceReport(
        'Mixed Repository Scalability Test',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      expect(report.meetsRequirements).toBe(true);

      console.log(`Mixed repository (${mixedFiles.length} files, ${totalLines} lines):`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Throughput: ${aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec`);
      console.log(`  Memory efficiency: ${aggregateMetrics.memoryEfficiency.toFixed(2)} lines/MB`);
      console.log(`  Peak memory: ${aggregateMetrics.peakMemoryUsageMB.toFixed(2)}MB`);
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance under sustained load', async () => {
      const language: SupportedLangType = 'javascript';
      const fileSize = 1000;
      const lineLimit = 100;
      const iterations = 20;
      const performanceSnapshots: PerformanceMetrics[] = [];

      // Process the same file multiple times to test sustained performance
      for (let i = 0; i < iterations; i++) {
        const content = generateLargeFile(language, fileSize);
        const filePath = `test-iteration-${i}.js`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        performanceSnapshots.push(metrics);

        // Performance should not degrade significantly over time
        expect(metrics.processingTimeMs).toBeLessThan(1000); // Less than 1 second per iteration
        expect(metrics.memoryUsageMB).toBeLessThan(50);
      }

      // Analyze performance consistency
      const times = performanceSnapshots.map((m) => m.processingTimeMs);
      const memoryUsages = performanceSnapshots.map((m) => m.memoryUsageMB);

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const avgMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;

      const timeVariance = times.reduce((sum, time) => sum + (time - avgTime) ** 2, 0) / times.length;
      const memoryVariance = memoryUsages.reduce((sum, mem) => sum + (mem - avgMemory) ** 2, 0) / memoryUsages.length;

      const timeStdDev = Math.sqrt(timeVariance);
      const memoryStdDev = Math.sqrt(memoryVariance);

      const timeCV = (timeStdDev / avgTime) * 100;
      const memoryCV = (memoryStdDev / avgMemory) * 100;

      // Performance should be consistent (CV < 30%)
      expect(timeCV).toBeLessThan(30);
      expect(memoryCV).toBeLessThan(30);

      // No significant performance degradation over time
      const firstHalf = times.slice(0, Math.floor(iterations / 2));
      const secondHalf = times.slice(Math.floor(iterations / 2));

      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      const degradation = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      expect(Math.abs(degradation)).toBeLessThan(20); // Less than 20% degradation

      console.log(`Sustained load performance (${iterations} iterations):`);
      console.log(`  Time CV: ${timeCV.toFixed(2)}%`);
      console.log(`  Memory CV: ${memoryCV.toFixed(2)}%`);
      console.log(`  Performance degradation: ${degradation.toFixed(2)}%`);
    });

    test('should handle memory pressure gracefully', async () => {
      const language: SupportedLangType = 'python';
      const largeFileSize = 5000;
      const lineLimit = 500;
      const concurrentFiles = 5;

      // Create multiple large files to create memory pressure
      const files = generateFileSet(concurrentFiles, language, largeFileSize);

      // Process files concurrently to increase memory pressure
      const concurrentPromises = files.map(async (file, index) => {
        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(file.content, file.filePath, lineLimit);
        });
        return { index, metrics };
      });

      const results = await Promise.all(concurrentPromises);

      // All files should process successfully even under memory pressure
      for (const { index, metrics } of results) {
        expect(metrics.processingTimeMs).toBeGreaterThan(0);
        expect(metrics.memoryUsageMB).toBeGreaterThan(0);
        expect(metrics.linesProcessed).toBe(largeFileSize);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);

        console.log(
          `File ${index + 1} under memory pressure: ${metrics.processingTimeMs.toFixed(2)}ms, ${metrics.memoryUsageMB.toFixed(2)}MB`,
        );
      }

      // Peak memory should be reasonable
      const peakMemoryUsage = Math.max(...results.map((r) => r.metrics.peakMemoryUsageMB));
      expect(peakMemoryUsage).toBeLessThan(500); // Reasonable peak memory limit

      console.log(`Peak memory usage under pressure: ${peakMemoryUsage.toFixed(2)}MB`);
    });
  });

  describe('Scalability Limits', () => {
    test('should identify performance limits and bottlenecks', async () => {
      const language: SupportedLangType = 'javascript';
      const extremeFileSizes = [10000, 25000, 50000, 75000];
      const lineLimit = 1000;
      const bottleneckAnalysis: Array<{
        size: number;
        timeMs: number;
        memoryMB: number;
        throughput: number;
        withinLimits: boolean;
      }> = [];

      for (const size of extremeFileSizes) {
        const content = generateLargeFile(language, size);
        const filePath = `extreme-${size}.js`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        const withinLimits =
          metrics.processingTimeMs < size * 1.0 && // Less than 1ms per line
          metrics.memoryUsageMB < 200 && // Less than 200MB
          metrics.throughputLinesPerSec > 10; // More than 10 lines/sec

        bottleneckAnalysis.push({
          size,
          timeMs: metrics.processingTimeMs,
          memoryMB: metrics.memoryUsageMB,
          throughput: metrics.throughputLinesPerSec,
          withinLimits,
        });

        console.log(
          `Extreme size (${size} lines): ${metrics.processingTimeMs.toFixed(2)}ms, ${metrics.memoryUsageMB.toFixed(2)}MB, ${withinLimits ? 'OK' : 'LIMIT'}`,
        );
      }

      // Analyze where performance starts to degrade
      const performanceBreakpoints = bottleneckAnalysis.filter((analysis) => !analysis.withinLimits);

      if (performanceBreakpoints.length > 0) {
        const firstBreakpoint = performanceBreakpoints[0];
        console.log(`Performance degradation starts at: ${firstBreakpoint.size} lines`);

        // Performance should degrade gracefully, not catastrophically
        expect(firstBreakpoint.timeMs).toBeLessThan(firstBreakpoint.size * 2); // Not more than 2x expected
        expect(firstBreakpoint.memoryMB).toBeLessThan(500); // Reasonable upper bound
      } else {
        console.log('All extreme file sizes within performance limits');
      }

      // Performance should scale reasonably even at extreme sizes
      const lastPerformance = bottleneckAnalysis[bottleneckAnalysis.length - 1];
      expect(lastPerformance.throughput).toBeGreaterThan(5); // Minimum throughput even for extreme sizes
    });

    test('should provide performance recommendations based on file characteristics', async () => {
      const testCases = [
        { size: 1000, complexity: 'simple', language: 'javascript' as SupportedLangType },
        { size: 5000, complexity: 'medium', language: 'python' as SupportedLangType },
        { size: 15000, complexity: 'complex', language: 'java' as SupportedLangType },
        { size: 30000, complexity: 'very-complex', language: 'typescript' as SupportedLangType },
      ];

      const recommendations: Array<{
        size: number;
        complexity: string;
        language: string;
        recommendedLineLimit: number;
        expectedTimeMs: number;
        expectedMemoryMB: number;
        notes: string[];
      }> = [];

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.size);
        const filePath = `recommendation-test-${testCase.size}.js`;

        // Test different line limits to find optimal one
        const lineLimits = [50, 100, 200, 500, 1000];
        let bestPerformance = null;
        let bestLineLimit = lineLimits[0];

        for (const lineLimit of lineLimits) {
          const { metrics } = await measurePerformance(async () => {
            return await applyLineLimit(content, filePath, lineLimit);
          });

          if (
            !bestPerformance ||
            metrics.processingTimeMs < bestPerformance.processingTimeMs ||
            (metrics.processingTimeMs === bestPerformance.processingTimeMs &&
              metrics.memoryUsageMB < bestPerformance.memoryUsageMB)
          ) {
            bestPerformance = metrics;
            bestLineLimit = lineLimit;
          }
        }

        const recommendedLineLimit = bestLineLimit;
        const expectedTimeMs = bestPerformance!.processingTimeMs;
        const expectedMemoryMB = bestPerformance!.memoryUsageMB;

        const notes: string[] = [];

        if (testCase.size > 10000) {
          notes.push('Consider splitting large files into smaller modules');
        }
        if (recommendedLineLimit < testCase.size * 0.05) {
          notes.push('Very aggressive line limiting may lose important context');
        }
        if (expectedMemoryMB > 100) {
          notes.push('High memory usage - consider processing in smaller batches');
        }

        recommendations.push({
          size: testCase.size,
          complexity: testCase.complexity,
          language: testCase.language,
          recommendedLineLimit,
          expectedTimeMs,
          expectedMemoryMB,
          notes,
        });
      }

      // Verify recommendations are reasonable
      for (const rec of recommendations) {
        expect(rec.recommendedLineLimit).toBeGreaterThan(0);
        expect(rec.recommendedLineLimit).toBeLessThanOrEqual(rec.size);
        expect(rec.expectedTimeMs).toBeGreaterThan(0);
        expect(rec.expectedMemoryMB).toBeGreaterThan(0);

        console.log(`Recommendations for ${rec.language} (${rec.size} lines, ${rec.complexity}):`);
        console.log(`  Recommended line limit: ${rec.recommendedLineLimit}`);
        console.log(`  Expected time: ${rec.expectedTimeMs.toFixed(2)}ms`);
        console.log(`  Expected memory: ${rec.expectedMemoryMB.toFixed(2)}MB`);
        if (rec.notes.length > 0) {
          console.log(`  Notes: ${rec.notes.join(', ')}`);
        }
      }
    });
  });
});
