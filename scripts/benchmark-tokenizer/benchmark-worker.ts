/**
 * Benchmark: Worker pool token counting (end-to-end)
 *
 * Measures the actual Repomix workflow: spin up worker threads, initialize
 * the tokenizer inside each worker, and count tokens — the same path
 * exercised at runtime.
 *
 * This is the scenario PR #1243 optimises (WASM module sharing across workers).
 * We compare gpt-tokenizer (no WASM) against tiktoken (WASM per-worker).
 *
 * Usage:
 *   npm run build && npx tsx scripts/benchmark-tokenizer/benchmark-worker.ts
 *   npm run build && npx tsx scripts/benchmark-tokenizer/benchmark-worker.ts --iterations 20
 */

import { Worker } from 'node:worker_threads';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const WARMUP_ITERATIONS = 2;
const DEFAULT_ITERATIONS = 10;
const NUM_WORKERS = 3;

const iterations = (() => {
  const idx = process.argv.indexOf('--iterations');
  return idx !== -1 ? Number.parseInt(process.argv[idx + 1], 10) : DEFAULT_ITERATIONS;
})();

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const generateFiles = () => {
  const files: Array<{ path: string; content: string }> = [];

  // Simulate a small repo: 50 files of varying sizes
  for (let i = 0; i < 20; i++) {
    files.push({
      path: `src/small-${i}.ts`,
      content: `export const x${i} = ${i};\nconsole.log(x${i});\n`.repeat(5),
    });
  }
  for (let i = 0; i < 20; i++) {
    files.push({
      path: `src/medium-${i}.ts`,
      content: `import { useState } from 'react';\n\nexport function Component${i}() {\n  const [count, setCount] = useState(0);\n  return <div>{count}</div>;\n}\n`.repeat(
        20,
      ),
    });
  }
  for (let i = 0; i < 10; i++) {
    files.push({
      path: `src/large-${i}.ts`,
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(500),
    });
  }

  return files;
};

// ---------------------------------------------------------------------------
// Worker inline code
// ---------------------------------------------------------------------------
// We create inline workers that import the actual tokenizer and count tokens.
// This avoids needing a separate compiled worker file for the benchmark.

const gptWorkerCode = `
import { workerData, parentPort } from 'node:worker_threads';
import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncoding } from 'gpt-tokenizer/resolveEncoding';

const initStart = process.hrtime.bigint();
const enc = GptEncoding.getEncodingApi('o200k_base', resolveEncoding);
const initEnd = process.hrtime.bigint();
const initMs = Number(initEnd - initStart) / 1e6;

let totalTokens = 0;
const encodeStart = process.hrtime.bigint();
for (const file of workerData.files) {
  totalTokens += enc.encode(file.content, { disallowedSpecial: new Set() }).length;
}
const encodeEnd = process.hrtime.bigint();
const encodeMs = Number(encodeEnd - encodeStart) / 1e6;

parentPort.postMessage({ initMs, encodeMs, totalTokens });
`;

const gptPreBuiltWorkerCode = `
import { workerData, parentPort } from 'node:worker_threads';
import { BytePairEncodingCore } from 'gpt-tokenizer/BytePairEncodingCore';
import { GptEncoding } from 'gpt-tokenizer/GptEncoding';

const initStart = process.hrtime.bigint();

// Restore encoding from pre-built data (bypasses expensive Map construction)
const d = workerData.preBuilt;
const core = Object.create(BytePairEncodingCore.prototype);
core.textEncoder = new TextEncoder();
core.mergeCacheSize = 100000;
core.mergeCache = new Map();
core.bytePairRankDecoder = d.bytePairRankDecoder;
core.bytePairStringRankEncoder = d.bytePairStringRankEncoder;
core.bytePairNonUtfRankDecoder = d.bytePairNonUtfRankDecoder;
core.bytePairNonUtfSortedEncoder = d.bytePairNonUtfSortedEncoder;
core.mergeableBytePairRankCount = d.mergeableBytePairRankCount;
core.tokenSplitRegex = d.tokenSplitRegex;
core.specialTokensEncoder = d.specialTokensEncoder;
core.specialTokensDecoder = d.specialTokensDecoder;
core.specialTokenPatternRegex = new RegExp(d.specialTokenPatternSource, 'y');
const enc = Object.create(GptEncoding.prototype);
enc.bytePairEncodingCoreProcessor = core;
enc.specialTokensEncoder = d.specialTokensEncoder;
enc.specialTokensSet = new Set(d.specialTokensEncoder.keys());
enc.defaultSpecialTokenConfig = {};

const initEnd = process.hrtime.bigint();
const initMs = Number(initEnd - initStart) / 1e6;

let totalTokens = 0;
const encodeStart = process.hrtime.bigint();
for (const file of workerData.files) {
  totalTokens += enc.encode(file.content, { disallowedSpecial: new Set() }).length;
}
const encodeEnd = process.hrtime.bigint();
const encodeMs = Number(encodeEnd - encodeStart) / 1e6;

parentPort.postMessage({ initMs, encodeMs, totalTokens });
`;

const tikWorkerCode = `
import { workerData, parentPort } from 'node:worker_threads';
import { get_encoding } from 'tiktoken';

const initStart = process.hrtime.bigint();
const enc = get_encoding('o200k_base');
const initEnd = process.hrtime.bigint();
const initMs = Number(initEnd - initStart) / 1e6;

let totalTokens = 0;
const encodeStart = process.hrtime.bigint();
for (const file of workerData.files) {
  totalTokens += enc.encode(file.content, [], []).length;
}
const encodeEnd = process.hrtime.bigint();
const encodeMs = Number(encodeEnd - encodeStart) / 1e6;

enc.free();
parentPort.postMessage({ initMs, encodeMs, totalTokens });
`;

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
interface WorkerResult {
  initMs: number;
  encodeMs: number;
  totalTokens: number;
}

const runWorkers = (
  code: string,
  filesPerWorker: Array<{ path: string; content: string }>[],
  extraData?: Record<string, unknown>,
): Promise<WorkerResult[]> => {
  return Promise.all(
    filesPerWorker.map(
      (files) =>
        new Promise<WorkerResult>((resolve, reject) => {
          const worker = new Worker(code, {
            eval: true,
            workerData: { files, ...extraData },
          });
          worker.on('message', (msg: WorkerResult) => resolve(msg));
          worker.on('error', reject);
        }),
    ),
  );
};

interface RunResult {
  wallMs: number;
  workerInitMedian: number;
  workerEncodeMedian: number;
  totalTokens: number;
}

const splitFiles = (files: Array<{ path: string; content: string }>, n: number) => {
  const result: Array<Array<{ path: string; content: string }>> = Array.from({ length: n }, () => []);
  for (let i = 0; i < files.length; i++) {
    result[i % n].push(files[i]);
  }
  return result;
};

const runOnce = async (
  code: string,
  files: Array<{ path: string; content: string }>,
  extraData?: Record<string, unknown>,
): Promise<RunResult> => {
  const perWorker = splitFiles(files, NUM_WORKERS);
  const wallStart = process.hrtime.bigint();
  const results = await runWorkers(code, perWorker, extraData);
  const wallEnd = process.hrtime.bigint();
  const wallMs = Number(wallEnd - wallStart) / 1e6;

  const inits = results.map((r) => r.initMs).sort((a, b) => a - b);
  const encodes = results.map((r) => r.encodeMs).sort((a, b) => a - b);
  const totalTokens = results.reduce((sum, r) => sum + r.totalTokens, 0);

  return {
    wallMs,
    workerInitMedian: inits[Math.floor(inits.length / 2)],
    workerEncodeMedian: encodes[Math.floor(encodes.length / 2)],
    totalTokens,
  };
};

const calcStats = (values: number[]) => {
  values.sort((a, b) => a - b);
  return {
    median: values[Math.floor(values.length / 2)],
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    min: values[0],
    max: values[values.length - 1],
    p90: values[Math.floor(values.length * 0.9)],
  };
};

const fmt = (ms: number): string => {
  if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
  return `${ms.toFixed(1)}ms`;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const main = async () => {
  console.log('='.repeat(80));
  console.log('Worker Pool Benchmark: gpt-tokenizer vs tiktoken');
  console.log(`Workers: ${NUM_WORKERS} | Iterations: ${iterations} | Warmup: ${WARMUP_ITERATIONS}`);
  console.log('='.repeat(80));
  console.log();

  const files = generateFiles();
  const totalChars = files.reduce((sum, f) => sum + f.content.length, 0);
  console.log(`Test data: ${files.length} files, ${(totalChars / 1024).toFixed(1)}KB total`);
  console.log();

  // Helper to run a scenario
  const runScenario = async (label: string, code: string, extraData?: Record<string, unknown>) => {
    console.log(`Running ${label}...`);
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      await runOnce(code, files, extraData);
    }
    const walls: number[] = [];
    const inits: number[] = [];
    const encodes: number[] = [];
    let tokens = 0;
    for (let i = 0; i < iterations; i++) {
      const r = await runOnce(code, files, extraData);
      walls.push(r.wallMs);
      inits.push(r.workerInitMedian);
      encodes.push(r.workerEncodeMedian);
      tokens = r.totalTokens;
    }
    return { walls: calcStats(walls), inits: calcStats(inits), encodes: calcStats(encodes), tokens };
  };

  // --- Run all scenarios ---
  const gpt = await runScenario('gpt-tokenizer (build from scratch)', gptWorkerCode);

  // Pre-build encoding data in the main thread for sharing with workers
  const { GptEncoding } = await import('gpt-tokenizer/GptEncoding');
  const { resolveEncoding } = await import('gpt-tokenizer/resolveEncoding');
  const enc = GptEncoding.getEncodingApi('o200k_base', resolveEncoding);
  const core = (enc as unknown as Record<string, unknown>).bytePairEncodingCoreProcessor as Record<string, unknown>;
  const preBuiltData = {
    preBuilt: {
      bytePairRankDecoder: core.bytePairRankDecoder,
      bytePairStringRankEncoder: core.bytePairStringRankEncoder,
      bytePairNonUtfRankDecoder: core.bytePairNonUtfRankDecoder,
      bytePairNonUtfSortedEncoder: core.bytePairNonUtfSortedEncoder,
      mergeableBytePairRankCount: core.mergeableBytePairRankCount,
      tokenSplitRegex: core.tokenSplitRegex,
      specialTokensEncoder: core.specialTokensEncoder,
      specialTokensDecoder: core.specialTokensDecoder,
      specialTokenPatternSource: (core.specialTokenPatternRegex as RegExp).source,
    },
  };
  const gptPre = await runScenario('gpt-tokenizer (pre-built shared)', gptPreBuiltWorkerCode, preBuiltData);

  const tik = await runScenario('tiktoken (WASM)', tikWorkerCode);

  // --- Results ---
  const scenarios = [
    { name: 'gpt (scratch)', ...gpt },
    { name: 'gpt (pre-built)', ...gptPre },
    { name: 'tiktoken', ...tik },
  ];

  const printTable = (title: string, getter: (s: (typeof scenarios)[0]) => ReturnType<typeof calcStats>) => {
    console.log(`## ${title}`);
    console.log('-'.repeat(80));
    console.log(`${''.padEnd(18)} ${'Median'.padEnd(12)} ${'Mean'.padEnd(12)} ${'Min'.padEnd(12)} ${'Max'.padEnd(12)} ${'P90'.padEnd(12)}`);
    for (const s of scenarios) {
      const st = getter(s);
      console.log(`${s.name.padEnd(18)} ${fmt(st.median).padEnd(12)} ${fmt(st.mean).padEnd(12)} ${fmt(st.min).padEnd(12)} ${fmt(st.max).padEnd(12)} ${fmt(st.p90).padEnd(12)}`);
    }
    console.log();
  };

  console.log();
  printTable('Worker Init Time', (s) => s.inits);
  printTable('Worker Encode Time', (s) => s.encodes);
  printTable('End-to-End Wall Time', (s) => s.walls);

  console.log('## Token Count Consistency');
  console.log('-'.repeat(80));
  for (const s of scenarios) {
    console.log(`${s.name.padEnd(18)} ${s.tokens} tokens`);
  }
  const allMatch = scenarios.every((s) => s.tokens === scenarios[0].tokens);
  console.log(`Match: ${allMatch ? 'ALL MATCH ✓' : 'MISMATCH ✗'}`);
};

main().catch(console.error);
