#!/usr/bin/env node

/**
 * Memory test for runCli
 * - Fast and lightweight for CI (default)
 * - Comprehensive analysis when needed (--full flag)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as asciichart from 'asciichart';
import { runCli } from 'repomix';
import type { MemoryHistory, MemoryTestSummary, MemoryUsage, TestConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  full: args.includes('--full') || args.includes('-f'),
  continuous: args.includes('--continuous'),
  saveResults: args.includes('--save') || args.includes('-s'),
  help: args.includes('--help') || args.includes('-h'),
};

// Extract numeric arguments
const numericArgs = args.filter((arg) => !arg.startsWith('-') && !Number.isNaN(Number(arg)));
const iterations = Number(numericArgs[0]) || (flags.full ? 200 : 100);
const delay = Number(numericArgs[1]) || (flags.full ? 100 : 50);

// Configuration constants
const MEMORY_LOG_INTERVAL = flags.full ? 10 : 5;
const FORCE_GC_INTERVAL = flags.full ? 50 : 20;
const WARNING_THRESHOLD = flags.full ? 50 : 100; // Memory growth percentage

// Graph display constants
const MIN_POINTS_FOR_GRAPH = 5;
const GRAPH_DATA_POINTS = 40;
const GRAPH_HEIGHT = 8;

// Test configuration
const TEST_CONFIG: TestConfig = {
  name: 'Memory Test',
  args: ['.'],
  cwd: projectRoot,
  options: {
    include: 'src/**/*.ts',
    output: path.join(__dirname, '../test-output.txt'),
    compress: true,
    quiet: true,
  },
};
const memoryHistory: MemoryHistory[] = [];

function showHelp(): void {
  console.log(`
🧪 Memory Test for Repomix

Usage: node memory-test.ts [iterations] [delay] [options]

Arguments:
  iterations     Number of test iterations (default: 50 for basic, 200 for --full)
  delay          Delay between iterations in ms (default: 50 for basic, 100 for --full)

Options:
  --full, -f       Enable comprehensive testing (more iterations, detailed analysis)
  --continuous     Run until stopped with Ctrl+C
  --save, -s       Save detailed results to JSON file
  --help, -h       Show this help message

Examples:
  node memory-test.ts                    # Quick CI test (50 iterations)
  node memory-test.ts --full             # Comprehensive test (200 iterations)
  node memory-test.ts 100 200            # 100 iterations, 200ms delay
  node memory-test.ts --continuous       # Run until Ctrl+C
`);
}

function getMemoryUsage(): MemoryUsage {
  const usage = process.memoryUsage();
  const heapUsed = Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
  const heapTotal = Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100;
  const external = Math.round((usage.external / 1024 / 1024) * 100) / 100;
  const rss = Math.round((usage.rss / 1024 / 1024) * 100) / 100;
  const heapUsagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100 * 100) / 100;

  return {
    heapUsed,
    heapTotal,
    external,
    rss,
    heapUsagePercent,
  };
}

function forceGC(): void {
  if (global.gc) {
    global.gc();
    console.log('🗑️  Forced garbage collection');
  }
}

function logMemoryUsage(iteration: number, configName: string, error: Error | null = null): void {
  const usage = getMemoryUsage();
  const timestamp = new Date().toISOString();

  memoryHistory.push({
    iteration,
    configName,
    timestamp,
    ...usage,
    error: !!error,
  });

  const statusIcon = error ? '❌' : '✅';
  const errorText = error ? ` (ERROR: ${error.message})` : '';

  // Format with fixed widths for alignment
  const iterationStr = `Iteration ${iteration.toString().padStart(3)}`;
  const configStr = configName.padEnd(12);
  const heapStr = `${usage.heapUsed.toString().padStart(6)}MB`;
  const heapTotalStr = `${usage.heapTotal.toString().padStart(6)}MB`;
  const heapPercentStr = `(${usage.heapUsagePercent.toString().padStart(5)}%)`;
  const rssStr = `${usage.rss.toString().padStart(6)}MB`;

  console.log(
    `${statusIcon} ${iterationStr}: ${configStr} - ` +
      `Heap: ${heapStr}/${heapTotalStr} ${heapPercentStr}, ` +
      `RSS: ${rssStr}${errorText}`,
  );
}

async function cleanupFiles(): Promise<void> {
  try {
    await fs.unlink(TEST_CONFIG.options.output);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      console.warn(`Failed to cleanup ${TEST_CONFIG.options.output}:`, error.message);
    }
  }
}

function displayMemoryGraphs(history: MemoryHistory[]): void {
  if (history.length < MIN_POINTS_FOR_GRAPH) return;

  const recentHistory = history.slice(-GRAPH_DATA_POINTS);

  const heapData = recentHistory.map((entry) => entry.heapUsed);
  const rssData = recentHistory.map((entry) => entry.rss);

  console.log('\n📈 Memory Usage Graphs:');

  console.log('\n🔸 Heap Usage (MB):');
  console.log(
    asciichart.plot(heapData, {
      height: GRAPH_HEIGHT,
      format: (x: number) => x.toFixed(1),
    }),
  );

  console.log('\n🔹 RSS Usage (MB):');
  console.log(
    asciichart.plot(rssData, {
      height: GRAPH_HEIGHT,
      format: (x: number) => x.toFixed(1),
    }),
  );
}

function analyzeMemoryTrends(): void {
  if (memoryHistory.length < 10) return;

  // Compare post-warmup baseline vs recent, not cold-start vs recent
  const warmupCount = Math.max(1, Math.floor(memoryHistory.length * 0.2));
  const baseline = memoryHistory.slice(warmupCount, warmupCount + 10);
  const recent = memoryHistory.slice(-10);

  if (baseline.length === 0) return;

  const avgBaselineHeap = baseline.reduce((sum, entry) => sum + entry.heapUsed, 0) / baseline.length;
  const avgRecentHeap = recent.reduce((sum, entry) => sum + entry.heapUsed, 0) / recent.length;
  const avgBaselineRSS = baseline.reduce((sum, entry) => sum + entry.rss, 0) / baseline.length;
  const avgRecentRSS = recent.reduce((sum, entry) => sum + entry.rss, 0) / recent.length;

  const heapGrowth = avgBaselineHeap > 0 ? ((avgRecentHeap - avgBaselineHeap) / avgBaselineHeap) * 100 : 0;
  const rssGrowth = avgBaselineRSS > 0 ? ((avgRecentRSS - avgBaselineRSS) / avgBaselineRSS) * 100 : 0;

  console.log('\n📊 Memory Trend Analysis (post-warmup):');
  console.log(
    `   Heap: ${avgBaselineHeap.toFixed(2)}MB → ${avgRecentHeap.toFixed(2)}MB (${heapGrowth.toFixed(2)}%)`,
  );
  console.log(`   RSS:  ${avgBaselineRSS.toFixed(2)}MB → ${avgRecentRSS.toFixed(2)}MB (${rssGrowth.toFixed(2)}%)`);

  if (heapGrowth > WARNING_THRESHOLD || rssGrowth > WARNING_THRESHOLD) {
    console.log('⚠️  WARNING: Significant memory growth detected - possible memory leak!');
  }

  // Show graphs
  displayMemoryGraphs(memoryHistory);
}

async function saveMemoryHistory(): Promise<void> {
  if (!flags.saveResults && !flags.full) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, '..', `memory-test-results-${timestamp}.json`);

  const summary: MemoryTestSummary = {
    testInfo: {
      iterations: memoryHistory.length,
      startTime: memoryHistory[0]?.timestamp || '',
      endTime: memoryHistory[memoryHistory.length - 1]?.timestamp || '',
    },
    memoryHistory,
    analysis: {
      peakHeapUsage: Math.max(...memoryHistory.map((h) => h.heapUsed)),
      peakRSSUsage: Math.max(...memoryHistory.map((h) => h.rss)),
      errorCount: memoryHistory.filter((h) => h.error).length,
      averageHeapUsage: memoryHistory.reduce((sum, h) => sum + h.heapUsed, 0) / memoryHistory.length,
      averageRSSUsage: memoryHistory.reduce((sum, h) => sum + h.rss, 0) / memoryHistory.length,
    },
  };

  try {
    await fs.writeFile(filename, JSON.stringify(summary, null, 2));
    console.log(`\n💾 Memory test results saved to: ${filename}`);
  } catch (error) {
    console.error('Failed to save memory history:', error instanceof Error ? error.message : String(error));
  }
}

async function runMemoryTest(): Promise<void> {
  const totalIterations = flags.continuous ? Number.POSITIVE_INFINITY : iterations;

  // Log initial memory usage
  console.log('📊 Initial Memory Usage:');
  logMemoryUsage(0, 'Initial', null);

  console.log(`\n🚀 Starting ${flags.continuous ? 'continuous' : totalIterations} test iterations...`);
  console.log(`🎯 Delay: ${delay}ms\n`);

  const startTime = Date.now();

  for (let i = 1; i <= totalIterations; i++) {
    let error: Error | null = null;

    try {
      // Run the CLI with test configuration
      await runCli(TEST_CONFIG.args, TEST_CONFIG.cwd, TEST_CONFIG.options);

      // Clean up output files after each run
      await cleanupFiles();
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
    }

    // Log memory usage at specified intervals or on error
    if (i % MEMORY_LOG_INTERVAL === 0 || error) {
      logMemoryUsage(i, TEST_CONFIG.name, error);
    }

    // Force garbage collection at specified intervals
    if (i % FORCE_GC_INTERVAL === 0) {
      forceGC();
    }

    // Analyze trends periodically (only in full mode)
    if (flags.full && i % (MEMORY_LOG_INTERVAL * 2) === 0 && i > 20) {
      analyzeMemoryTrends();
    }

    // Add delay between iterations
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Safety exit for continuous mode during CI
    if (flags.continuous && !flags.full && Date.now() - startTime > 60000) {
      // 1 minute limit for CI
      console.log('\n⏱️  CI time limit reached, stopping continuous test');
      break;
    }
  }

  console.log('\n✅ Memory test completed!');

  // Final analysis — compare post-warmup baseline vs final measurements.
  // The first ~20% of iterations are warmup (V8 JIT, module caching, heap expansion),
  // so comparing cold-start to final would always show large growth that is not a leak.
  const warmupCount = Math.max(1, Math.floor(memoryHistory.length * 0.2));

  if (memoryHistory.length >= 10) {
    const baselineEntries = memoryHistory.slice(warmupCount, warmupCount + 5);
    const recentEntries = memoryHistory.slice(-5);

    const avgBaselineHeap = baselineEntries.reduce((sum, e) => sum + e.heapUsed, 0) / baselineEntries.length;
    const avgRecentHeap = recentEntries.reduce((sum, e) => sum + e.heapUsed, 0) / recentEntries.length;
    const avgBaselineRSS = baselineEntries.reduce((sum, e) => sum + e.rss, 0) / baselineEntries.length;
    const avgRecentRSS = recentEntries.reduce((sum, e) => sum + e.rss, 0) / recentEntries.length;

    const heapGrowth = avgBaselineHeap > 0 ? ((avgRecentHeap - avgBaselineHeap) / avgBaselineHeap) * 100 : 0;
    const rssGrowth = avgBaselineRSS > 0 ? ((avgRecentRSS - avgBaselineRSS) / avgBaselineRSS) * 100 : 0;

    console.log('\n📊 Final Memory Analysis (post-warmup baseline vs final):');
    console.log(`Baseline (avg ${warmupCount + 1}–${warmupCount + 5}): Heap ${avgBaselineHeap.toFixed(2)}MB, RSS ${avgBaselineRSS.toFixed(2)}MB`);
    console.log(`Final    (avg last 5):     Heap ${avgRecentHeap.toFixed(2)}MB, RSS ${avgRecentRSS.toFixed(2)}MB`);
    console.log(`Growth:  Heap ${heapGrowth.toFixed(2)}%, RSS ${rssGrowth.toFixed(2)}%`);

    // Exit with error code if memory growth exceeds threshold
    if (heapGrowth > WARNING_THRESHOLD || rssGrowth > WARNING_THRESHOLD) {
      console.log('⚠️  WARNING: Significant memory growth detected!');
      process.exitCode = 1;
    } else {
      console.log('✅ Memory usage appears stable');
    }
  } else {
    console.log('\n📊 Too few data points for reliable analysis (need at least 10)');
  }

  // Show final graph
  if (memoryHistory.length >= MIN_POINTS_FOR_GRAPH) {
    console.log('\n📈 Complete Memory Usage Timeline:');
    displayMemoryGraphs(memoryHistory);
  }

  // Save results if requested
  await saveMemoryHistory();

  // Final cleanup
  await cleanupFiles();
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Test interrupted by user');
  await saveMemoryHistory();
  await cleanupFiles();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('\n❌ Uncaught exception:', error);
  await saveMemoryHistory();
  await cleanupFiles();
  process.exit(1);
});

// Show help and exit
if (flags.help) {
  showHelp();
  process.exit(0);
}

// Validate arguments
if (Number.isNaN(iterations) || iterations <= 0) {
  console.error('❌ Invalid iterations count. Must be a positive number.');
  process.exit(1);
}

if (Number.isNaN(delay) || delay < 0) {
  console.error('❌ Invalid delay. Must be a non-negative number.');
  process.exit(1);
}

// Display configuration
console.log('🧪 Memory Test');
console.log(`📋 Mode: ${flags.full ? 'Comprehensive' : 'Basic'} (${iterations} iterations, ${delay}ms delay)`);
console.log(
  `⚡ Features: ${
    [
      flags.continuous && 'Continuous Mode',
      flags.saveResults && 'Save Results',
      flags.full && 'Full Analysis',
      'Graph Display',
    ]
      .filter(Boolean)
      .join(', ') || 'Basic Test'
  }`,
);
console.log('🛑 Press Ctrl+C to stop\n');

// Run the test
runMemoryTest().catch(async (error) => {
  console.error('\n❌ Test failed:', error);
  await saveMemoryHistory();
  await cleanupFiles();
  process.exit(1);
});
