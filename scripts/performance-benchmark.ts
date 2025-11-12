#!/usr/bin/env node

/**
 * Performance Benchmarking Infrastructure for Repomix Line Limiting Feature
 * 
 * This script provides comprehensive performance benchmarking capabilities:
 * - Baseline performance measurement
 * - Regression detection
 * - Performance trend analysis
 * - Automated performance reporting
 */

import { writeFile, mkdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { program } from 'commander';
import { 
  measurePerformance, 
  measureBaselinePerformance,
  generatePerformanceReport,
  type PerformanceMetrics,
  type PerformanceThresholds
} from '../tests/performance/performanceUtils.js';
import { 
  generateLargeFile, 
  generateFileSet, 
  generatePerformanceTestCases,
  type PerformanceTestCase,
  type GeneratedFile 
} from '../tests/performance/testDataGenerators.js';
import { applyLineLimit } from '../src/core/file/lineLimitProcessor.js';

interface BenchmarkConfig {
  outputDir: string;
  baselineFile: string;
  reportFile: string;
  thresholds: PerformanceThresholds;
  iterations: number;
  warmupIterations: number;
}

interface BenchmarkResult {
  timestamp: string;
  config: BenchmarkConfig;
  results: PerformanceMetrics[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageTimeMs: number;
    averageMemoryMB: number;
    regressionDetected: boolean;
  };
  recommendations: string[];
}

class PerformanceBenchmark {
  private config: BenchmarkConfig;
  private baselineData: PerformanceMetrics[] = [];
  private currentResults: PerformanceMetrics[] = [];

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  /**
   * Initialize the benchmark environment
   */
  async initialize(): Promise<void> {
    // Create output directory if it doesn't exist
    await mkdir(this.config.outputDir, { recursive: true });

    // Load baseline data if available
    try {
      const baselineData = await readFile(this.config.baselineFile, 'utf-8');
      const baseline = JSON.parse(baselineData) as BenchmarkResult;
      this.baselineData = baseline.results;
      console.log(`Loaded baseline data from ${this.config.baselineFile}`);
    } catch (error) {
      console.log('No baseline data found, will create new baseline');
    }
  }

  /**
   * Run warmup iterations to stabilize performance
   */
  async warmup(): Promise<void> {
    console.log(`Running ${this.config.warmupIterations} warmup iterations...`);
    
    for (let i = 0; i < this.config.warmupIterations; i++) {
      const content = generateLargeFile('javascript', 1000);
      await applyLineLimit(content, 'warmup.js', 100);
    }
    
    console.log('Warmup completed');
  }

  /**
   * Run comprehensive performance benchmarks
   */
  async runBenchmarks(): Promise<void> {
    console.log('Starting performance benchmarks...');
    
    // Run warmup
    await this.warmup();
    
    // Get test cases
    const testCases = generatePerformanceTestCases();
    console.log(`Running ${testCases.length} test cases...`);
    
    // Run each test case
    for (const testCase of testCases) {
      await this.runTestCase(testCase);
    }
    
    // Generate summary and recommendations
    const summary = this.generateSummary();
    const recommendations = this.generateRecommendations();
    
    // Create benchmark result
    const result: BenchmarkResult = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.currentResults,
      summary,
      recommendations
    };
    
    // Save results
    await this.saveResults(result);
    
    // Print summary
    this.printSummary(result);
  }

  /**
   * Run a single test case
   */
  private async runTestCase(testCase: PerformanceTestCase): Promise<void> {
    console.log(`\nTesting: ${testCase.language} (${testCase.lineCount} lines, limit: ${testCase.lineLimit})`);
    
    const caseResults: PerformanceMetrics[] = [];
    
    // Run multiple iterations for statistical significance
    for (let i = 0; i < this.config.iterations; i++) {
      const content = generateLargeFile(testCase.language, testCase.lineCount);
      const filePath = `benchmark-${testCase.language}-${testCase.lineCount}-${i}.js`;
      
      const { metrics } = await measurePerformance(async () => {
        return await applyLineLimit(content, filePath, testCase.lineLimit);
      });
      
      caseResults.push(metrics);
    }
    
    // Calculate average metrics
    const avgMetrics = this.calculateAverageMetrics(caseResults);
    this.currentResults.push(avgMetrics);
    
    // Check against thresholds
    const passesThresholds = this.checkThresholds(avgMetrics, testCase);
    
    console.log(`  Average time: ${avgMetrics.processingTimeMs.toFixed(2)}ms`);
    console.log(`  Average memory: ${avgMetrics.memoryUsageMB.toFixed(2)}MB`);
    console.log(`  Throughput: ${avgMetrics.throughputLinesPerSec.toFixed(2)} lines/sec`);
    console.log(`  Status: ${passesThresholds ? 'PASS' : 'FAIL'}`);
  }

  /**
   * Calculate average metrics from multiple iterations
   */
  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const count = metrics.length;
    
    return {
      processingTimeMs: metrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / count,
      memoryUsageMB: metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / count,
      peakMemoryUsageMB: Math.max(...metrics.map(m => m.peakMemoryUsageMB)),
      linesProcessed: metrics[0].linesProcessed, // Should be the same for all iterations
      linesOutput: metrics[0].linesOutput, // Should be the same for all iterations
      lineLimit: metrics[0].lineLimit,
      language: metrics[0].language,
      fileSizeBytes: metrics[0].fileSizeBytes, // Should be the same for all iterations
      throughputLinesPerSec: metrics.reduce((sum, m) => sum + m.throughputLinesPerSec, 0) / count,
      memoryEfficiency: metrics.reduce((sum, m) => sum + m.memoryEfficiency, 0) / count,
    };
  }

  /**
   * Check if metrics meet performance thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics, testCase: PerformanceTestCase): boolean {
    return (
      metrics.processingTimeMs <= testCase.expectedMaxTimeMs &&
      metrics.memoryUsageMB <= testCase.expectedMaxMemoryMB &&
      metrics.throughputLinesPerSec >= 50 // Minimum throughput threshold
    );
  }

  /**
   * Generate benchmark summary
   */
  private generateSummary() {
    const totalTests = this.currentResults.length;
    const testCases = generatePerformanceTestCases();
    let passedTests = 0;
    
    for (let i = 0; i < totalTests; i++) {
      if (this.checkThresholds(this.currentResults[i], testCases[i])) {
        passedTests++;
      }
    }
    
    const failedTests = totalTests - passedTests;
    const averageTimeMs = this.currentResults.reduce((sum, m) => sum + m.processingTimeMs, 0) / totalTests;
    const averageMemoryMB = this.currentResults.reduce((sum, m) => sum + m.memoryUsageMB, 0) / totalTests;
    
    // Check for regression
    const regressionDetected = this.detectRegression();
    
    return {
      totalTests,
      passedTests,
      failedTests,
      averageTimeMs,
      averageMemoryMB,
      regressionDetected
    };
  }

  /**
   * Detect performance regression compared to baseline
   */
  private detectRegression(): boolean {
    if (this.baselineData.length === 0 || this.currentResults.length === 0) {
      return false;
    }
    
    // Compare average performance
    const currentAvgTime = this.currentResults.reduce((sum, m) => sum + m.processingTimeMs, 0) / this.currentResults.length;
    const baselineAvgTime = this.baselineData.reduce((sum, m) => sum + m.processingTimeMs, 0) / this.baselineData.length;
    
    const timeRegression = (currentAvgTime - baselineAvgTime) / baselineAvgTime;
    
    // Regression detected if performance degraded by more than 10%
    return timeRegression > 0.1;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.generateSummary();
    
    // Performance-based recommendations
    if (summary.failedTests > 0) {
      recommendations.push(`${summary.failedTests} test(s) failed performance thresholds - investigate bottlenecks`);
    }
    
    if (summary.averageTimeMs > 1000) {
      recommendations.push('Average processing time is high - consider optimization strategies');
    }
    
    if (summary.averageMemoryMB > 100) {
      recommendations.push('Memory usage is high - investigate memory leaks or inefficient algorithms');
    }
    
    if (summary.regressionDetected) {
      recommendations.push('Performance regression detected - compare with baseline and investigate changes');
    }
    
    // File size-based recommendations
    const largeFileResults = this.currentResults.filter(m => m.linesProcessed > 10000);
    if (largeFileResults.length > 0) {
      const avgLargeFileTime = largeFileResults.reduce((sum, m) => sum + m.processingTimeMs, 0) / largeFileResults.length;
      if (avgLargeFileTime > 5000) {
        recommendations.push('Large files processing is slow - consider streaming or chunked processing');
      }
    }
    
    // Language-specific recommendations
    const languagePerformance = new Map<string, PerformanceMetrics[]>();
    for (const metrics of this.currentResults) {
      if (!languagePerformance.has(metrics.language)) {
        languagePerformance.set(metrics.language, []);
      }
      languagePerformance.get(metrics.language)!.push(metrics);
    }
    
    for (const [language, metrics] of languagePerformance) {
      const avgTime = metrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / metrics.length;
      if (avgTime > 2000) {
        recommendations.push(`${language} processing is slow - investigate language-specific optimizations`);
      }
    }
    
    return recommendations;
  }

  /**
   * Save benchmark results to file
   */
  private async saveResults(result: BenchmarkResult): Promise<void> {
    const resultFile = join(this.config.outputDir, `benchmark-${Date.now()}.json`);
    await writeFile(resultFile, JSON.stringify(result, null, 2));
    
    // Update baseline if this is the first run or if performance improved
    if (this.baselineData.length === 0 || !result.summary.regressionDetected) {
      await writeFile(this.config.baselineFile, JSON.stringify(result, null, 2));
      console.log(`Updated baseline: ${this.config.baselineFile}`);
    }
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(result);
    const reportFile = join(this.config.outputDir, `report-${Date.now()}.html`);
    await writeFile(reportFile, htmlReport);
    
    console.log(`Results saved to: ${resultFile}`);
    console.log(`HTML report saved to: ${reportFile}`);
  }

  /**
   * Generate HTML performance report
   */
  private generateHTMLReport(result: BenchmarkResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Benchmark Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .regression { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; }
        .recommendations h3 { margin-top: 0; }
        .recommendations ul { margin-bottom: 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Benchmark Report</h1>
        <p><strong>Timestamp:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
        <p><strong>Test Configuration:</strong> ${result.config.iterations} iterations, ${result.config.warmupIterations} warmup</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${result.summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value pass">${result.summary.passedTests}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div class="value fail">${result.summary.failedTests}</div>
        </div>
        <div class="metric">
            <h3>Avg Time</h3>
            <div class="value">${result.summary.averageTimeMs.toFixed(2)}ms</div>
        </div>
        <div class="metric">
            <h3>Avg Memory</h3>
            <div class="value">${result.summary.averageMemoryMB.toFixed(2)}MB</div>
        </div>
        <div class="metric">
            <h3>Regression</h3>
            <div class="value ${result.summary.regressionDetected ? 'regression' : 'pass'}">
                ${result.summary.regressionDetected ? 'DETECTED' : 'NONE'}
            </div>
        </div>
    </div>

    <h2>Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Language</th>
                <th>Lines</th>
                <th>Limit</th>
                <th>Time (ms)</th>
                <th>Memory (MB)</th>
                <th>Throughput (lines/sec)</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${result.results.map(metrics => `
                <tr>
                    <td>${metrics.language}</td>
                    <td>${metrics.linesProcessed}</td>
                    <td>${metrics.lineLimit}</td>
                    <td>${metrics.processingTimeMs.toFixed(2)}</td>
                    <td>${metrics.memoryUsageMB.toFixed(2)}</td>
                    <td>${metrics.throughputLinesPerSec.toFixed(2)}</td>
                    <td class="${metrics.processingTimeMs < 1000 ? 'pass' : 'fail'}">
                        ${metrics.processingTimeMs < 1000 ? 'PASS' : 'FAIL'}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${result.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>Recommendations</h3>
            <ul>
                ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
</body>
</html>`;
  }

  /**
   * Print benchmark summary to console
   */
  private printSummary(result: BenchmarkResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('BENCHMARK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${result.summary.totalTests}`);
    console.log(`Passed: ${result.summary.passedTests}`);
    console.log(`Failed: ${result.summary.failedTests}`);
    console.log(`Average Time: ${result.summary.averageTimeMs.toFixed(2)}ms`);
    console.log(`Average Memory: ${result.summary.averageMemoryMB.toFixed(2)}MB`);
    console.log(`Regression: ${result.summary.regressionDetected ? 'DETECTED' : 'NONE'}`);
    
    if (result.recommendations.length > 0) {
      console.log('\nRECOMMENDATIONS:');
      result.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    console.log('='.repeat(60));
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: BenchmarkConfig = {
  outputDir: './performance-results',
  baselineFile: './performance-results/baseline.json',
  reportFile: './performance-results/latest-report.html',
  thresholds: {
    smallFileMaxTimeMs: 1000,
    mediumFileMaxTimeMs: 10000,
    largeFileMaxTimeMs: 100000,
    veryLargeFileMaxTimeMs: 500000,
    maxPerformanceImpactPercentage: 5,
    smallFileMaxMemoryMB: 10,
    mediumFileMaxMemoryMB: 20,
    largeFileMaxMemoryMB: 50,
    veryLargeFileMaxMemoryMB: 100,
  },
  iterations: 3,
  warmupIterations: 2,
};

/**
 * CLI setup
 */
program
  .name('performance-benchmark')
  .description('Performance benchmarking for Repomix line limiting feature')
  .version('1.0.0');

program
  .command('run')
  .description('Run performance benchmarks')
  .option('-o, --output <dir>', 'Output directory', DEFAULT_CONFIG.outputDir)
  .option('-i, --iterations <number>', 'Number of iterations per test', DEFAULT_CONFIG.iterations.toString())
  .option('-w, --warmup <number>', 'Number of warmup iterations', DEFAULT_CONFIG.warmupIterations.toString())
  .option('--baseline <file>', 'Baseline file path', DEFAULT_CONFIG.baselineFile)
  .action(async (options) => {
    const config: BenchmarkConfig = {
      ...DEFAULT_CONFIG,
      outputDir: options.output,
      iterations: parseInt(options.iterations),
      warmupIterations: parseInt(options.warmup),
      baselineFile: options.baseline,
    };

    const benchmark = new PerformanceBenchmark(config);
    await benchmark.initialize();
    await benchmark.runBenchmarks();
  });

program
  .command('compare')
  .description('Compare performance with baseline')
  .option('-b, --baseline <file>', 'Baseline file path', DEFAULT_CONFIG.baselineFile)
  .option('-c, --current <file>', 'Current results file')
  .action(async (options) => {
    // Implementation for comparison logic
    console.log('Comparison feature not yet implemented');
  });

program
  .command('trend')
  .description('Analyze performance trends over time')
  .option('-d, --dir <dir>', 'Results directory', DEFAULT_CONFIG.outputDir)
  .action(async (options) => {
    // Implementation for trend analysis
    console.log('Trend analysis feature not yet implemented');
  });

// Run CLI
if (require.main === module) {
  program.parse();
}

export { PerformanceBenchmark, type BenchmarkConfig, type BenchmarkResult };