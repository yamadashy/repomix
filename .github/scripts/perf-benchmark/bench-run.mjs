import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  try {
    run(prBin, prDir);
  } catch {}
  try {
    run(mainBin, mainDir);
  } catch {}
}

// Interleaved measurement: alternate PR and main each iteration
// so both branches experience similar runner load conditions.
// Even/odd alternation neutralizes ordering bias from CPU/filesystem cache warming.
const prTimes = [];
const mainTimes = [];
for (let i = 0; i < runs; i++) {
  console.error(`Run ${i + 1}/${runs}`);
  if (i % 2 === 0) {
    try {
      prTimes.push(run(prBin, prDir));
    } catch (e) {
      console.error(`PR run ${i + 1} failed: ${e.message}`);
    }
    try {
      mainTimes.push(run(mainBin, mainDir));
    } catch (e) {
      console.error(`main run ${i + 1} failed: ${e.message}`);
    }
  } else {
    try {
      mainTimes.push(run(mainBin, mainDir));
    } catch (e) {
      console.error(`main run ${i + 1} failed: ${e.message}`);
    }
    try {
      prTimes.push(run(prBin, prDir));
    } catch (e) {
      console.error(`PR run ${i + 1} failed: ${e.message}`);
    }
  }
}

if (prTimes.length === 0 || mainTimes.length === 0) {
  console.error('All benchmark runs failed');
  process.exit(1);
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
