import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { applyLineLimit } from '../../src/core/file/lineLimitProcessor.js';
import {
  DEFAULT_PERFORMANCE_THRESHOLDS,
  generatePerformanceReport,
  measurePerformance,
  type PerformanceMetrics,
} from './performanceUtils.js';
import { type GeneratedFile, generateFileSet, generateLargeFile } from './testDataGenerators.js';

describe('Large File Performance Tests', () => {
  beforeEach(() => {
    // Mock console methods to reduce noise during performance tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Small Files Performance (< 100 lines)', () => {
    test('should process 50-line JavaScript file within 1 second', async () => {
      const content = generateLargeFile('javascript', 50);
      const filePath = 'test.js';
      const lineLimit = 10;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(1000);
      expect(metrics.memoryUsageMB).toBeLessThan(10);
      expect(metrics.linesProcessed).toBe(50);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(50);
    });

    test('should process 75-line Python file within 1 second', async () => {
      const content = generateLargeFile('python', 75);
      const filePath = 'test.py';
      const lineLimit = 15;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(1000);
      expect(metrics.memoryUsageMB).toBeLessThan(10);
      expect(metrics.linesProcessed).toBe(75);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(75);
    });

    test('should process 90-line Java file within 1 second', async () => {
      const content = generateLargeFile('java', 90);
      const filePath = 'test.java';
      const lineLimit = 20;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(1000);
      expect(metrics.memoryUsageMB).toBeLessThan(10);
      expect(metrics.linesProcessed).toBe(90);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(90);
    });
  });

  describe('Medium Files Performance (100-1000 lines)', () => {
    test('should process 250-line TypeScript file within 10 seconds', async () => {
      const content = generateLargeFile('typescript', 250);
      const filePath = 'test.ts';
      const lineLimit = 50;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(10000);
      expect(metrics.memoryUsageMB).toBeLessThan(20);
      expect(metrics.linesProcessed).toBe(250);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(25);
    });

    test('should process 500-line Python file within 10 seconds', async () => {
      const content = generateLargeFile('python', 500);
      const filePath = 'test.py';
      const lineLimit = 100;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(10000);
      expect(metrics.memoryUsageMB).toBeLessThan(20);
      expect(metrics.linesProcessed).toBe(500);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(50);
    });

    test('should process 750-line Java file within 10 seconds', async () => {
      const content = generateLargeFile('java', 750);
      const filePath = 'test.java';
      const lineLimit = 150;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(10000);
      expect(metrics.memoryUsageMB).toBeLessThan(20);
      expect(metrics.linesProcessed).toBe(750);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(75);
    });

    test('should process 1000-line Go file within 10 seconds', async () => {
      const content = generateLargeFile('go', 1000);
      const filePath = 'test.go';
      const lineLimit = 200;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(10000);
      expect(metrics.memoryUsageMB).toBeLessThan(20);
      expect(metrics.linesProcessed).toBe(1000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
    });
  });

  describe('Large Files Performance (1000-10000 lines)', () => {
    test('should process 2000-line JavaScript file within 100 seconds', async () => {
      const content = generateLargeFile('javascript', 2000);
      const filePath = 'test.js';
      const lineLimit = 200;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(100000);
      expect(metrics.memoryUsageMB).toBeLessThan(50);
      expect(metrics.linesProcessed).toBe(2000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(20);
    });

    test('should process 3500-line TypeScript file within 100 seconds', async () => {
      const content = generateLargeFile('typescript', 3500);
      const filePath = 'test.ts';
      const lineLimit = 350;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(100000);
      expect(metrics.memoryUsageMB).toBeLessThan(50);
      expect(metrics.linesProcessed).toBe(3500);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(35);
    });

    test('should process 5000-line Python file within 100 seconds', async () => {
      const content = generateLargeFile('python', 5000);
      const filePath = 'test.py';
      const lineLimit = 500;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(100000);
      expect(metrics.memoryUsageMB).toBeLessThan(50);
      expect(metrics.linesProcessed).toBe(5000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(50);
    });

    test('should process 7500-line Java file within 100 seconds', async () => {
      const content = generateLargeFile('java', 7500);
      const filePath = 'test.java';
      const lineLimit = 750;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(100000);
      expect(metrics.memoryUsageMB).toBeLessThan(50);
      expect(metrics.linesProcessed).toBe(7500);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(75);
    });

    test('should process 10000-line Go file within 100 seconds', async () => {
      const content = generateLargeFile('go', 10000);
      const filePath = 'test.go';
      const lineLimit = 1000;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(100000);
      expect(metrics.memoryUsageMB).toBeLessThan(50);
      expect(metrics.linesProcessed).toBe(10000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
    });
  });

  describe('Very Large Files Performance (> 10000 lines)', () => {
    test('should process 15000-line JavaScript file within 500 seconds', async () => {
      const content = generateLargeFile('javascript', 15000);
      const filePath = 'test.js';
      const lineLimit = 1500;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(500000);
      expect(metrics.memoryUsageMB).toBeLessThan(100);
      expect(metrics.linesProcessed).toBe(15000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(30);
    });

    test('should process 25000-line Python file within 500 seconds', async () => {
      const content = generateLargeFile('python', 25000);
      const filePath = 'test.py';
      const lineLimit = 2500;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(500000);
      expect(metrics.memoryUsageMB).toBeLessThan(100);
      expect(metrics.linesProcessed).toBe(25000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(50);
    });

    test('should process 35000-line Java file within 500 seconds', async () => {
      const content = generateLargeFile('java', 35000);
      const filePath = 'test.java';
      const lineLimit = 3500;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(500000);
      expect(metrics.memoryUsageMB).toBeLessThan(100);
      expect(metrics.linesProcessed).toBe(35000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(70);
    });

    test('should process 50000-line Go file within 500 seconds', async () => {
      const content = generateLargeFile('go', 50000);
      const filePath = 'test.go';
      const lineLimit = 5000;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      expect(metrics.processingTimeMs).toBeLessThan(500000);
      expect(metrics.memoryUsageMB).toBeLessThan(100);
      expect(metrics.linesProcessed).toBe(50000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.throughputLinesPerSec).toBeGreaterThan(100);
    });
  });

  describe('Memory Efficiency for Large Files', () => {
    test('should maintain memory efficiency scaling with file size', async () => {
      const fileSizes = [1000, 5000, 10000, 25000];
      const memoryEfficiencies: number[] = [];

      for (const size of fileSizes) {
        const content = generateLargeFile('javascript', size);
        const filePath = 'test.js';
        const lineLimit = Math.floor(size * 0.1); // 10% limit

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        memoryEfficiencies.push(metrics.memoryEfficiency);

        // Memory efficiency should not degrade significantly
        expect(metrics.memoryEfficiency).toBeGreaterThan(50); // At least 50 lines per MB
      }

      // Check that efficiency doesn't drop dramatically with larger files
      const efficiencyDropRatio = memoryEfficiencies[0] / memoryEfficiencies[memoryEfficiencies.length - 1];
      expect(efficiencyDropRatio).toBeLessThan(5); // Less than 5x drop in efficiency

      console.log(`Memory efficiency scaling: ${memoryEfficiencies.map((e) => e.toFixed(2)).join(' -> ')}`);
    });

    test('should handle memory-intensive operations without overflow', async () => {
      const content = generateLargeFile('javascript', 30000);
      const filePath = 'test.js';
      const lineLimit = 3000;

      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable for the file size
      expect(memoryGrowth).toBeLessThan(200); // Less than 200MB growth
      expect(metrics.peakMemoryUsageMB).toBeLessThan(300); // Peak under 300MB

      console.log(`Memory growth for 30k lines: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('Performance Scaling Analysis', () => {
    test('should demonstrate linear or sub-linear performance scaling', async () => {
      const fileSizes = [500, 1000, 2000, 5000, 10000];
      const processingTimes: number[] = [];

      for (const size of fileSizes) {
        const content = generateLargeFile('javascript', size);
        const filePath = 'test.js';
        const lineLimit = Math.floor(size * 0.1);

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, lineLimit);
        });

        processingTimes.push(metrics.processingTimeMs);
      }

      // Calculate scaling factor between consecutive sizes
      const scalingFactors: number[] = [];
      for (let i = 1; i < processingTimes.length; i++) {
        const sizeRatio = fileSizes[i] / fileSizes[i - 1];
        const timeRatio = processingTimes[i] / processingTimes[i - 1];
        scalingFactors.push(timeRatio / sizeRatio);
      }

      // Scaling should be close to linear (factor close to 1)
      const avgScalingFactor = scalingFactors.reduce((sum, factor) => sum + factor, 0) / scalingFactors.length;
      expect(avgScalingFactor).toBeLessThan(1.5); // Less than 1.5x linear scaling

      console.log(`Processing times: ${processingTimes.map((t) => t.toFixed(2)).join('ms, ')}`);
      console.log(`Scaling factors: ${scalingFactors.map((f) => f.toFixed(2)).join(', ')}`);
      console.log(`Average scaling factor: ${avgScalingFactor.toFixed(2)}`);
    });

    test('should generate comprehensive performance report', async () => {
      const testCases = [
        { size: 1000, language: 'javascript' as const, limit: 100 },
        { size: 5000, language: 'python' as const, limit: 500 },
        { size: 10000, language: 'java' as const, limit: 1000 },
      ];

      const fileMetrics: PerformanceMetrics[] = [];

      for (const testCase of testCases) {
        const content = generateLargeFile(testCase.language, testCase.size);
        const filePath = `test.${getFileExtension(testCase.language)}`;

        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(content, filePath, testCase.limit);
        });

        fileMetrics.push(metrics);
      }

      const report = generatePerformanceReport(
        'Large File Performance Analysis',
        fileMetrics,
        undefined,
        DEFAULT_PERFORMANCE_THRESHOLDS,
      );

      // Verify report structure
      expect(report.testCase).toBe('Large File Performance Analysis');
      expect(report.fileMetrics).toHaveLength(3);
      expect(report.aggregateMetrics.linesProcessed).toBeGreaterThan(0);
      expect(report.meetsRequirements).toBe(true); // Should meet requirements for our test data

      // Log report for manual inspection
      console.log('Large File Performance Report:');
      console.log(`Total lines processed: ${report.aggregateMetrics.linesProcessed}`);
      console.log(`Total processing time: ${report.aggregateMetrics.processingTimeMs.toFixed(2)}ms`);
      console.log(`Average throughput: ${report.aggregateMetrics.throughputLinesPerSec.toFixed(2)} lines/sec`);
      console.log(`Total memory usage: ${report.aggregateMetrics.memoryUsageMB.toFixed(2)}MB`);
    });
  });

  describe('Stress Tests', () => {
    test('should handle extremely large files gracefully', async () => {
      // Test with a very large file (larger than typical PRD requirements)
      const content = generateLargeFile('javascript', 75000);
      const filePath = 'test.js';
      const lineLimit = 7500;

      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, lineLimit);
      });

      // Should still complete without errors
      expect(metrics.linesProcessed).toBe(75000);
      expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
      expect(metrics.processingTimeMs).toBeGreaterThan(0);
      expect(metrics.memoryUsageMB).toBeGreaterThan(0);

      // Performance should be reasonable even for extreme sizes
      expect(metrics.processingTimeMs).toBeLessThan(1000000); // Less than ~16 minutes
      expect(metrics.memoryUsageMB).toBeLessThan(500); // Less than 500MB

      console.log(
        `Extreme size test (75k lines): ${metrics.processingTimeMs.toFixed(2)}ms, ${metrics.memoryUsageMB.toFixed(2)}MB`,
      );
    });

    test('should handle multiple large files in sequence', async () => {
      const files: GeneratedFile[] = [
        {
          content: generateLargeFile('javascript', 5000),
          filePath: 'test1.js',
          language: 'javascript',
          actualLineCount: 5000,
        },
        { content: generateLargeFile('python', 5000), filePath: 'test2.py', language: 'python', actualLineCount: 5000 },
        { content: generateLargeFile('java', 5000), filePath: 'test3.java', language: 'java', actualLineCount: 5000 },
      ];

      const fileMetrics: PerformanceMetrics[] = [];
      const lineLimit = 500;

      for (const file of files) {
        const { metrics } = await measurePerformance(async () => {
          return await applyLineLimit(file.content, file.filePath, lineLimit);
        });
        fileMetrics.push(metrics);
      }

      // All files should be processed successfully
      expect(fileMetrics).toHaveLength(3);
      fileMetrics.forEach((metrics) => {
        expect(metrics.linesProcessed).toBe(5000);
        expect(metrics.linesOutput).toBeLessThanOrEqual(lineLimit);
        expect(metrics.processingTimeMs).toBeLessThan(100000);
        expect(metrics.memoryUsageMB).toBeLessThan(100);
      });

      // Performance should be consistent across files
      const times = fileMetrics.map((m) => m.processingTimeMs);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + (time - avgTime) ** 2, 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgTime) * 100;

      expect(coefficientOfVariation).toBeLessThan(50); // Less than 50% variation

      console.log(`Sequential processing CV: ${coefficientOfVariation.toFixed(2)}%`);
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
