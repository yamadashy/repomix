/**
 * Benchmark: gpt-tokenizer vs tiktoken
 *
 * Compares initialization time, encoding throughput, and token count consistency
 * across various text sizes and types.
 *
 * Usage:
 *   npx tsx scripts/benchmark-tokenizer/benchmark.ts
 *   npx tsx scripts/benchmark-tokenizer/benchmark.ts --iterations 20
 */

import { get_encoding as tiktokenGetEncoding } from 'tiktoken';
import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncoding } from 'gpt-tokenizer/resolveEncoding';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const WARMUP_ITERATIONS = 3;
const DEFAULT_ITERATIONS = 10;
const ENCODING_NAME = 'o200k_base';

const iterations = (() => {
  const idx = process.argv.indexOf('--iterations');
  return idx !== -1 ? Number.parseInt(process.argv[idx + 1], 10) : DEFAULT_ITERATIONS;
})();

// ---------------------------------------------------------------------------
// Test data generators
// ---------------------------------------------------------------------------
const generateTestData = () => {
  const small = 'Hello, world! This is a simple test.';
  const medium = Array(100)
    .fill('The quick brown fox jumps over the lazy dog. ')
    .join('');
  const large = Array(10000)
    .fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ')
    .join('');
  const unicode = '日本語のテキスト。こんにちは世界！🌍🚀✨ Ελληνικά العربية 中文测试 한국어 Кириллица '.repeat(100);
  const code = `
import { useState, useEffect } from 'react';

interface Props {
  initialCount: number;
  onCountChange?: (count: number) => void;
}

export function Counter({ initialCount, onCountChange }: Props) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    onCountChange?.(count);
  }, [count, onCountChange]);

  return (
    <div className="counter">
      <button onClick={() => setCount(c => c - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
`.repeat(50);

  const specialTokens = 'Some text with <|endoftext|> and <|im_start|> special tokens <|im_end|> embedded.'.repeat(20);

  return { small, medium, large, unicode, code, specialTokens };
};

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------
interface BenchResult {
  mean: number;
  median: number;
  min: number;
  max: number;
  p95: number;
}

const runBench = (fn: () => void, _label: string): BenchResult => {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1e6); // ms
  }

  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const median = times[Math.floor(times.length / 2)];
  const min = times[0];
  const max = times[times.length - 1];
  const p95 = times[Math.floor(times.length * 0.95)];

  return { mean, median, min, max, p95 };
};

const fmt = (ms: number): string => {
  if (ms < 0.001) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
  return `${ms.toFixed(2)}ms`;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const main = () => {
  console.log('='.repeat(80));
  console.log('Tokenizer Benchmark: gpt-tokenizer vs tiktoken');
  console.log(`Encoding: ${ENCODING_NAME} | Iterations: ${iterations} | Warmup: ${WARMUP_ITERATIONS}`);
  console.log('='.repeat(80));
  console.log();

  // --- Initialization benchmark ---
  console.log('## Initialization');
  console.log('-'.repeat(60));

  const gptInitResult = runBench(() => {
    GptEncoding.getEncodingApi(ENCODING_NAME, resolveEncoding);
  }, 'gpt-tokenizer init');

  const tikInitResult = runBench(() => {
    const enc = tiktokenGetEncoding(ENCODING_NAME);
    enc.free();
  }, 'tiktoken init');

  const initSpeedup = tikInitResult.median / gptInitResult.median;
  console.log(`gpt-tokenizer : median=${fmt(gptInitResult.median)}, mean=${fmt(gptInitResult.mean)}, p95=${fmt(gptInitResult.p95)}`);
  console.log(`tiktoken      : median=${fmt(tikInitResult.median)}, mean=${fmt(tikInitResult.mean)}, p95=${fmt(tikInitResult.p95)}`);
  console.log(`  → gpt-tokenizer is ${initSpeedup.toFixed(1)}x ${initSpeedup > 1 ? 'faster' : 'slower'}`);
  console.log();

  // --- Encoding benchmarks ---
  const testData = generateTestData();
  const gptEnc = GptEncoding.getEncodingApi(ENCODING_NAME, resolveEncoding);
  const tikEnc = tiktokenGetEncoding(ENCODING_NAME);

  console.log('## Encoding Throughput');
  console.log('-'.repeat(60));

  const results: Array<{
    label: string;
    size: string;
    gpt: BenchResult;
    tik: BenchResult;
    gptTokens: number;
    tikTokens: number;
  }> = [];

  for (const [label, text] of Object.entries(testData)) {
    const gptResult = runBench(() => {
      gptEnc.encode(text, { disallowedSpecial: new Set() });
    }, `gpt-tokenizer ${label}`);

    const tikResult = runBench(() => {
      tikEnc.encode(text, [], []);
    }, `tiktoken ${label}`);

    const gptTokens = gptEnc.encode(text, { disallowedSpecial: new Set() }).length;
    const tikTokens = tikEnc.encode(text, [], []).length;

    const size = text.length < 1024 ? `${text.length}B` : `${(text.length / 1024).toFixed(1)}KB`;
    results.push({ label, size, gpt: gptResult, tik: tikResult, gptTokens, tikTokens });
  }

  // Print table header
  console.log(
    `${'Test'.padEnd(16)} ${'Size'.padEnd(10)} ${'gpt-tok (median)'.padEnd(18)} ${'tiktoken (median)'.padEnd(18)} ${'Speedup'.padEnd(10)} ${'Tokens match'}`,
  );
  console.log('-'.repeat(90));

  for (const r of results) {
    const speedup = r.tik.median / r.gpt.median;
    const match = r.gptTokens === r.tikTokens ? `✓ (${r.gptTokens})` : `✗ gpt=${r.gptTokens} tik=${r.tikTokens}`;
    console.log(
      `${r.label.padEnd(16)} ${r.size.padEnd(10)} ${fmt(r.gpt.median).padEnd(18)} ${fmt(r.tik.median).padEnd(18)} ${`${speedup.toFixed(1)}x`.padEnd(10)} ${match}`,
    );
  }

  console.log();

  // --- Memory comparison ---
  console.log('## Memory Usage');
  console.log('-'.repeat(60));

  // Force GC if available
  if (global.gc) {
    global.gc();
  }
  const memBefore = process.memoryUsage();

  // Encode a large text multiple times with gpt-tokenizer
  const largeText = testData.large;
  for (let i = 0; i < 5; i++) {
    gptEnc.encode(largeText, { disallowedSpecial: new Set() });
  }

  if (global.gc) {
    global.gc();
  }
  const memAfterGpt = process.memoryUsage();

  console.log(`Heap used (baseline) : ${(memBefore.heapUsed / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Heap used (after gpt): ${(memAfterGpt.heapUsed / 1024 / 1024).toFixed(1)}MB`);
  console.log(`RSS                  : ${(memAfterGpt.rss / 1024 / 1024).toFixed(1)}MB`);
  console.log();

  // --- Summary ---
  console.log('## Summary');
  console.log('-'.repeat(60));
  const allMatch = results.every((r) => r.gptTokens === r.tikTokens);
  console.log(`Token count consistency: ${allMatch ? 'ALL MATCH' : 'MISMATCH DETECTED'}`);

  const avgSpeedup = results.reduce((sum, r) => sum + r.tik.median / r.gpt.median, 0) / results.length;
  console.log(`Average encoding speedup: gpt-tokenizer is ${avgSpeedup.toFixed(1)}x ${avgSpeedup > 1 ? 'faster' : 'slower'} than tiktoken`);
  console.log(`Initialization speedup: gpt-tokenizer is ${initSpeedup.toFixed(1)}x ${initSpeedup > 1 ? 'faster' : 'slower'} than tiktoken`);

  // Cleanup
  tikEnc.free();
};

main();
