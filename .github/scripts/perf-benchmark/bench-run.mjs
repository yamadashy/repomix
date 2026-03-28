import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const [prDir, mainDir] = process.argv.slice(2);
const output = join(tmpdir(), 'repomix-bench-output.txt');
const runs = Number(process.env.BENCH_RUNS) || 20;

const prBin = join(prDir, 'bin', 'repomix.cjs');
const mainBin = join(mainDir, 'bin', 'repomix.cjs');

function run(bin, dir) {
  const start = Date.now();
  execFileSync(process.execPath, [bin, dir, '--output', output], { stdio: 'ignore' });
  return Date.now() - start;
}

// Warmup both branches to stabilize OS page cache and JIT
console.error('Warming up...');
for (let i = 0; i < 2; i++) {
  try { run(prBin, prDir); } catch {}
  try { run(mainBin, mainDir); } catch {}
}

// Interleaved measurement: alternate PR and main each iteration
// so both branches experience similar runner load conditions
const prTimes = [];
const mainTimes = [];
for (let i = 0; i < runs; i++) {
  console.error(`Run ${i + 1}/${runs}`);
  prTimes.push(run(prBin, prDir));
  mainTimes.push(run(mainBin, mainDir));
}

function stats(times) {
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const q1 = times[Math.floor(times.length * 0.25)];
  const q3 = times[Math.floor(times.length * 0.75)];
  return { median, iqr: q3 - q1 };
}

const pr = stats(prTimes);
const main = stats(mainTimes);

console.error(`PR median: ${pr.median}ms (±${pr.iqr}ms)`);
console.error(`main median: ${main.median}ms (±${main.iqr}ms)`);

const result = { pr: pr.median, prIqr: pr.iqr, main: main.median, mainIqr: main.iqr };
writeFileSync(join(process.env.RUNNER_TEMP, 'bench-result.json'), JSON.stringify(result));
