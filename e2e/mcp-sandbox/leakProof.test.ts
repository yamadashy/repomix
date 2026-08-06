import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { landstripBinaryPath } from '../../src/mcp/sandbox/landstrip.js';
import { connect, realpath, textOf } from './helpers.js';

// Leak-proof e2e for the long-lived sandboxed MCP server: once warmed up (grammar
// WASM, tokenizer tables, capped-heap steady state), memory must never grow again,
// however much more the server is used.
//
// The confined child runs with a capped V8 old space. Uncapped, node grows its heap
// lazily for dozens of packs on a flat live set — indistinguishable from a leak by
// any RSS threshold. The cap pulls the plateau inside the warmup waves and turns a
// real heap leak into an OOM crash (failed packs) instead of a slow drift; the RSS
// ceiling assertion still covers WASM/native growth, which lives outside the cap.
//
// RSS is sampled externally (the sandbox denies /proc to the child) and summed over
// the server's process tree — the idle wrapper (and, on Windows, the landstrip
// launcher) is a constant offset. The per-OS snapshot command is isolated in
// snapshotProcesses(); everything else is platform-shared.

const plat = process.platform;
const landstripAvailable: boolean = landstripBinaryPath() !== null;

const FILES = 40; // workspace size — enough that a per-file leak is amplified fast
const WARMUP_WAVES = 6; // capped-heap ramp reaches its plateau by ~wave 5 (measured)
const MEASURED_WAVES = 10;
const CONCURRENCY = 3; // packs in flight per wave — exercises cross-runner serialization
const HEAP_CAP_MB = 192; // confined child's V8 old-space cap (see header)
const CEILING_MB = 96; // post-warmup absolute growth ceiling (observed steady-state margin ≈ 40MB)
const PLATEAU_LIMIT_MB = 16; // max NET growth across the last 4 samples (observed ≈ 0; a leak adds ~10MB/wave)

// Real TS content so compress:true drives tree-sitter (the biggest warm singleton)
// alongside token counting + security scan — all three inline worker types per wave.
const mkStressWorkspace = (): string => {
  const w = realpath(fs.mkdtempSync(path.join(os.tmpdir(), 'rpx-stress-')));
  fs.mkdirSync(path.join(w, 'src'));
  for (let i = 0; i < FILES; i++) {
    const body = [
      `export interface Item${i} { id: number; name: string; tags: string[] }`,
      `export const make${i} = (id: number): Item${i} => ({ id, name: 'item-${i}-' + id, tags: ['a', 'b'] });`,
      `export function total${i}(items: Item${i}[]): number {`,
      '  return items.reduce((sum, item) => sum + item.id, 0);',
      '}',
      `export class Repo${i} {`,
      `  private items: Item${i}[] = [];`,
      `  add(item: Item${i}): void { this.items.push(item); }`,
      `  find(id: number): Item${i} | undefined { return this.items.find((i) => i.id === id); }`,
      '}',
    ].join('\n');
    fs.writeFileSync(path.join(w, 'src', `mod${i}.ts`), `${body}\n`);
  }
  return w;
};

// One "pid ppid rssBytes" snapshot of all processes — the only per-OS code here.
const snapshotProcesses = (): { rssBytes: Map<number, number>; children: Map<number, number[]> } => {
  const out =
    plat === 'win32'
      ? execFileSync(
          'powershell.exe',
          [
            '-NoProfile',
            '-Command',
            'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId) $($_.WorkingSetSize)" }',
          ],
          { encoding: 'utf8' },
        )
      : // ps reports rss in KB — normalized to bytes below.
        execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], { encoding: 'utf8' })
          .split('\n')
          .map((l) => {
            const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)$/);
            return m ? `${m[1]} ${m[2]} ${Number(m[3]) * 1024}` : '';
          })
          .join('\n');
  const rssBytes = new Map<number, number>();
  const children = new Map<number, number[]>();
  for (const line of out.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)$/);
    if (!m) continue;
    const [p, pp, r] = [Number(m[1]), Number(m[2]), Number(m[3])];
    rssBytes.set(p, r);
    if (!children.has(pp)) children.set(pp, []);
    children.get(pp)?.push(p);
  }
  return { rssBytes, children };
};

/** RSS (bytes) of `pid` plus all its descendants. */
const treeRssBytes = (pid: number): number => {
  const { rssBytes, children } = snapshotProcesses();
  let total = 0;
  const stack = [pid];
  while (stack.length) {
    const cur = stack.pop() as number;
    total += rssBytes.get(cur) ?? 0;
    for (const c of children.get(cur) ?? []) stack.push(c);
  }
  return total;
};

interface WaveRun {
  /** RSS samples, one per completed wave. */
  samples: number[];
  /** outputIds of the last completed wave. */
  lastWaveIds: string[];
  /** Set when the server died mid-run (e.g. OOM) — the wave's packs rejected. */
  crashed: boolean;
  grepLastOutput: (pattern: string) => Promise<string>;
  close: () => Promise<void>;
}

// Shared driver; it knows nothing about how the tests differ. `prepareWorkspace`
// sees the fresh workspace and returns extra node CLI args. A wave whose packs
// reject sets `crashed` and stops — what that means is the caller's call.
const runWaves = async (label: string, prepareWorkspace?: (ws: string) => string[]): Promise<WaveRun> => {
  const ws = mkStressWorkspace();
  const nodeArgs = [`--max-old-space-size=${HEAP_CAP_MB}`, ...(prepareWorkspace?.(ws) ?? [])];
  const { client, pid } = await connect(ws, { nodeArgs });
  const close = async (): Promise<void> => {
    await client.close().catch(() => {});
    fs.rmSync(ws, { recursive: true, force: true });
  };
  try {
    expect(pid).not.toBeNull();
    const serverPid = pid as number;

    const packOnce = async (): Promise<string> => {
      const pk = textOf(
        await client.callTool({ name: 'pack_codebase', arguments: { directory: '.', style: 'xml', compress: true } }),
      );
      const outputId = (pk.match(/"outputId"\s*:\s*"([a-f0-9]+)"/) || [])[1];
      expect(outputId, `pack did not return an outputId: ${pk.slice(0, 300)}`).toBeTruthy();
      return outputId as string;
    };
    const wave = async (): Promise<string[]> => Promise.all(Array.from({ length: CONCURRENCY }, () => packOnce()));

    const samples: number[] = [];
    let lastWaveIds: string[] = [];
    let crashed = false;
    for (let i = 0; i < WARMUP_WAVES + MEASURED_WAVES; i++) {
      try {
        lastWaveIds = await wave();
      } catch (e) {
        process.stderr.write(`[leak-proof:${label}] server died on wave ${i + 1}: ${e}\n`);
        crashed = true;
        break;
      }
      samples.push(treeRssBytes(serverPid));
    }

    const mb = (b: number): number => Math.round(b / (1024 * 1024));
    process.stderr.write(`[leak-proof:${label}] tree RSS per wave (MB): ${samples.map(mb).join(', ')}\n`);

    return {
      samples,
      lastWaveIds,
      crashed,
      grepLastOutput: async (pattern: string) =>
        textOf(await client.callTool({ name: 'grep_repomix_output', arguments: { outputId: lastWaveIds[0], pattern } })),
      close,
    };
  } catch (e) {
    await close();
    throw e;
  }
};

const mb = (b: number): number => Math.round(b / (1024 * 1024));

describe.runIf(landstripAvailable)(
  `Leak-proof — ${plat} (--sandbox-strict, long-lived server under sustained concurrent packs)`,
  () => {
    // Harness proof first: if this alarm can't fire, the real test's silence below
    // means nothing. The spy simulates a per-tool-use heap leak without touching
    // product code — preloaded via --require from INSIDE the workspace (the only
    // host path the kernel sandbox lets the child read), it retains 256KB per
    // fs.readFile (~30MB/wave vs the 192MB cap → OOM within a few waves). The
    // payload must be real memory: 'x'.repeat() is a lazy cons-string retaining
    // ~nothing.
    it(
      'harness detects a real heap leak: with the memory-stealing spy preloaded, the capped server dies loudly (OOM)',
      async () => {
        const heapSpySource = `
const fsp = require('node:fs/promises');
const leaked = [];
const orig = fsp.readFile;
fsp.readFile = async function (...args) {
  leaked.push(new Array(32768).fill(leaked.length)); // 256KB on-heap per read
  return orig.apply(this, args);
};
`;
        const run = await runWaves('spy', (ws) => {
          const spyPath = path.join(ws, 'heap-spy.cjs');
          fs.writeFileSync(spyPath, heapSpySource);
          return ['--require', spyPath];
        });
        try {
          expect(run.crashed, 'the spy-leaking server survived every wave — the leak harness failed to detect it').toBe(
            true,
          );
        } finally {
          await run.close();
        }
      },
      300000,
    );

    it(
      'survives sustained concurrent pack load with bounded memory and correct output',
      async () => {
        const run = await runWaves('clean');
        try {
          expect(run.crashed, 'server died mid-run — with the capped heap this is how a real heap leak presents').toBe(
            false,
          );

          // Concurrent packs on the shared warm parser must not corrupt results.
          expect(await run.grepLastOutput(`class Repo${FILES - 1}`)).toMatch(new RegExp(`Repo${FILES - 1}`));

          // Ceiling: the V8 heap is capped, so growth past this is WASM/native.
          const { samples } = run;
          const baseline = samples[WARMUP_WAVES - 1];
          const peak = Math.max(...samples.slice(WARMUP_WAVES));
          expect(
            peak - baseline,
            `post-warmup RSS peak grew ${mb(peak - baseline)}MB over baseline (ceiling ${CEILING_MB}MB); series: ${samples.map(mb).join(', ')}`,
          ).toBeLessThan(CEILING_MB * 1024 * 1024);

          // Plateau: NET growth across the final 4 samples — a per-pack leak adds
          // ~10MB/wave and cannot look flat. Shrinking is fine (macOS/Windows
          // reclaim idle pages, which is the opposite of a leak); a sawtooth that
          // shrinks between waves is still bounded by the peak ceiling above.
          const tail = samples.slice(-4);
          const growth = tail[tail.length - 1] - tail[0];
          expect(
            growth,
            `RSS still growing ${mb(growth)}MB across the last 4 waves (limit ${PLATEAU_LIMIT_MB}MB); series: ${samples.map(mb).join(', ')}`,
          ).toBeLessThan(PLATEAU_LIMIT_MB * 1024 * 1024);
        } finally {
          await run.close();
        }
      },
      300000,
    );
  },
);
