import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const dir = process.argv[2];
const output = join(tmpdir(), 'repomix-bench-output.txt');
const runs = Number(process.env.BENCH_RUNS) || 20;
const bin = join(dir, 'bin', 'repomix.cjs');

// Warmup runs to stabilize OS page cache and JIT
for (let i = 0; i < 2; i++) {
  try {
    execFileSync(process.execPath, [bin, dir, '--output', output], { stdio: 'ignore' });
  } catch {}
}

// Measurement runs
const times = [];
for (let i = 0; i < runs; i++) {
  const start = Date.now();
  execFileSync(process.execPath, [bin, dir, '--output', output], { stdio: 'ignore' });
  times.push(Date.now() - start);
}

times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)];
const q1 = times[Math.floor(times.length * 0.25)];
const q3 = times[Math.floor(times.length * 0.75)];
const iqr = q3 - q1;

const osName = process.env.RUNNER_OS;

// Output in customSmallerIsBetter format for github-action-benchmark
const result = [{
  name: `Repomix Pack (${osName})`,
  unit: 'ms',
  value: median,
  range: '±' + iqr,
  extra: `Median of ${runs} runs\nQ1: ${q1}ms, Q3: ${q3}ms\nAll times: ${times.join(', ')}ms`,
}];

writeFileSync(join(process.env.RUNNER_TEMP, 'bench-result.json'), JSON.stringify(result));
console.log(`${osName}: median=${median}ms (±${iqr}ms)`);
