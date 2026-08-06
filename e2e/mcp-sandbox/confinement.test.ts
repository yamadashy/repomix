import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { nodeSharedLibDirs } from '../../src/mcp/sandbox/shared.js';
import { bin, connect, realpath, textOf } from './helpers.js';

// Kernel confinement for `repomix --mcp --sandbox-strict`, against the BUILT server
// on the current OS (run after build: `node --run test-e2e`). Covers only what needs
// real processes: the sandbox doesn't break the tools, the kernel enforces the policy
// a real launch wrote, and the flag fail-closes without a backend. The software path
// guard is covered platform-independently in tests/mcp/pathScope.test.ts.

const plat = process.platform;
const nodeRequire = createRequire(import.meta.url);
// null when the optional per-platform package is absent (musl, unsupported arch).
const landstripBinPath: string | null = (() => {
  try {
    return (nodeRequire('@landstrip/landstrip') as { binaryPath: () => string }).binaryPath();
  } catch {
    return null;
  }
})();
const mkWorkspace = (): string => {
  const w = realpath(fs.mkdtempSync(path.join(os.tmpdir(), 'rpx-confine-')));
  fs.mkdirSync(path.join(w, 'src'));
  fs.writeFileSync(path.join(w, 'src', 'a.ts'), 'export const answer = 42;\n');
  // A real .git so a regression in the sandboxed git-skip guard surfaces as a hang
  // instead of passing vacuously against a workspace git had nothing to do in — so a
  // failed init has to be fatal, not silently tolerated.
  const git = spawnSync('git', ['init', '-q'], { cwd: w, timeout: 15000 });
  if (git.status !== 0) throw new Error(`git init failed in ${w}: status=${git.status} ${git.error ?? ''}`);
  return w;
};

interface ToolsWork {
  toolCount: number;
  readFile: boolean;
  readDir: boolean;
  pack: boolean;
  readOutput: boolean;
  grep: boolean;
}

// Drive every sandboxed tool end-to-end against a freshly spawned server under
// --sandbox-strict (required kernel), to confirm confinement does not break them.
const runAllTools = async (): Promise<ToolsWork> => {
  const ws = mkWorkspace();
  try {
    const { client } = await connect(ws);
    const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args });
    const { tools } = await client.listTools();
    const rf = textOf(await call('file_system_read_file', { path: 'src/a.ts' }));
    const ld = textOf(await call('file_system_read_directory', { path: '.' }));
    const pk = textOf(await call('pack_codebase', { directory: '.', style: 'xml' }));
    const outputId = (pk.match(/"outputId"\s*:\s*"([a-f0-9]+)"/) || [])[1];
    const ro = outputId ? textOf(await call('read_repomix_output', { outputId })) : '';
    const gr = outputId ? textOf(await call('grep_repomix_output', { outputId, pattern: 'answer' })) : '';
    await client.close().catch(() => {});
    const result: ToolsWork = {
      toolCount: tools.length,
      readFile: rf.includes('answer = 42'),
      readDir: ld.includes('src'),
      pack: !!outputId,
      readOutput: ro.includes('answer = 42'),
      grep: /answer/.test(gr),
    };
    // Dump the raw outputs the booleans hide, so a red CI run is debuggable.
    if (Object.values(result).some((v) => v === false)) {
      process.stderr.write(
        `[runAllTools] ${JSON.stringify(result)}\n  readFile=${JSON.stringify(rf)}\n  readDir=${JSON.stringify(ld)}\n  pack=${JSON.stringify(pk)}\n  readOutput=${JSON.stringify(ro)}\n  grep=${JSON.stringify(gr)}\n`,
      );
    }
    return result;
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
};

const ALL_TOOLS_WORK: ToolsWork = {
  toolCount: 5,
  readFile: true,
  readDir: true,
  pack: true,
  readOutput: true,
  grep: true,
};

// Kernel probe: raw fs/net syscalls under the policy a REAL launch wrote, bypassing
// the software path guard entirely — so a denial is attributable only to the kernel.

interface CapturedPolicy {
  /** Raw landstrip-policy.json the server's launcher actually wrote. */
  policy: string;
  /** The per-session temp dir the policy grants as its only writable root. */
  sessionTmp: string;
}

const waitUntil = async (cond: () => boolean, ms: number): Promise<boolean> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return cond();
};

// Capture the policy a real launch wrote, by steering the launcher's temp dir into a
// test-owned one. A completed handshake means the confined child is serving, so the
// policy on disk at that moment is exactly what the kernel was applied with.
const captureServerPolicy = async (ws: string, tmpParent: string): Promise<CapturedPolicy> => {
  const { client } = await connect(ws, { env: { TMPDIR: tmpParent, TEMP: tmpParent, TMP: tmpParent } });
  let session: string | undefined;
  try {
    const sessions = fs.readdirSync(tmpParent).filter((d) => d.startsWith('repomix-sbx-'));
    if (sessions.length !== 1) {
      throw new Error(`expected exactly 1 session tmp under ${tmpParent}, found: ${sessions.join(', ') || 'none'}`);
    }
    session = sessions[0];
    const policy = fs.readFileSync(path.join(tmpParent, session, 'landstrip-policy.json'), 'utf8');
    const writes = (JSON.parse(policy) as { filesystem: { allowWrite: string } }).filesystem.allowWrite.split('\n');
    // The canonicalized session tmp is the only writable grant.
    const sessionTmp = writes.find((w) => w.length > 0);
    if (!sessionTmp) throw new Error('captured policy has no session tmp in allowWrite');
    return { policy, sessionTmp };
  } finally {
    await client.close().catch(() => {});
    // The launcher removes its session tmp on exit; wait for that cleanup so the
    // probe's re-creation of the directory can't race the deletion.
    const gone = session;
    if (gone) await waitUntil(() => !fs.existsSync(path.join(tmpParent, gone)), 10000);
  }
};

// Run a bare `node -e` under the captured policy: in-workspace read must SUCCEED (so
// the grant isn't vacuously broken), while an outside-read, a workspace write, and
// outbound network must be denied. Env mirrors the production launch so a denial is
// attributable to the policy, not a missing boot precondition. Exit 0 iff all hold.
const kernelEnforcesCapturedPolicy = async (
  landstripBin: string,
  ws: string,
  cap: CapturedPolicy,
): Promise<boolean> => {
  const allowReads = (JSON.parse(cap.policy) as { filesystem: { allowRead: string } }).filesystem.allowRead.split(
    '\n',
  );
  const secretDir = realpath(fs.mkdtempSync(path.join(os.tmpdir(), 'rpx-ls-secret-')));
  const secretFile = path.join(secretDir, 'secret.txt');
  fs.writeFileSync(secretFile, 'TOPSECRET');
  try {
    // The denial claim below is only meaningful if the secret really is outside every
    // granted read root — assert that instead of assuming the host's layout.
    const covered = allowReads.some(
      (r) => secretFile === r || secretFile.startsWith(r.endsWith(path.sep) ? r : r + path.sep),
    );
    if (covered) throw new Error(`secret ${secretFile} falls inside a granted read root — cannot prove denial`);

    // Recreate the session tmp the policy grants (the server's launcher removed it on
    // exit) so the policy's paths exist when landstrip applies the sandbox, and give
    // the probe the same OpenSSL escape hatch the production child gets.
    fs.mkdirSync(cap.sessionTmp, { recursive: true });
    const opensslConf = path.join(cap.sessionTmp, 'openssl.cnf');
    fs.writeFileSync(opensslConf, '');
    const policyFile = path.join(cap.sessionTmp, 'landstrip-policy.json');
    fs.writeFileSync(policyFile, cap.policy);

    const okFile = JSON.stringify(path.join(ws, 'src', 'a.ts'));
    const secret = JSON.stringify(secretFile);
    const wsWrite = JSON.stringify(path.join(ws, 'kernel-write-probe.txt'));
    const checkUdp = plat === 'linux';
    const probe = `
      const fs = require('fs'), net = require('net'), dgram = require('dgram');
      const r = { wsRead: false, secretBlocked: false, wsWriteBlocked: false, tcpBlocked: null, udpBlocked: null };
      try { r.wsRead = fs.readFileSync(${okFile}, 'utf8').length > 0; } catch {}
      // The secret file EXISTS; a throw means the kernel denied the read (confined).
      try { fs.readFileSync(${secret}); } catch { r.secretBlocked = true; }
      // The workspace is read-only; writing into it must be kernel-denied.
      try { fs.writeFileSync(${wsWrite}, 'x'); } catch { r.wsWriteBlocked = true; }
      const finish = () => {
        const ok = r.wsRead && r.secretBlocked && r.wsWriteBlocked && r.tcpBlocked === true
          && (${checkUdp} ? r.udpBlocked === true : true);
        if (!ok) process.stderr.write('[probe] ' + JSON.stringify(r) + '\\n');
        process.exit(ok ? 0 : 1);
      };
      // An unconfined connect reaches 1.1.1.1:443 well under 3s on CI, so a timeout
      // counts as blocked — DROP-style filtering hangs rather than erroring.
      const tcp = new Promise((resolve) => {
        try {
          const s = net.connect({ host: '1.1.1.1', port: 443 });
          const done = (v) => { try { s.destroy(); } catch {} resolve(v); };
          s.once('connect', () => done(false));
          s.once('error', () => done(true));
          setTimeout(() => done(true), 3000);
        } catch { resolve(true); }
      });
      // The send callback fires immediately either way, so silence is an anomaly:
      // a timeout counts as NOT blocked rather than passing vacuously.
      const udp = ${checkUdp} ? new Promise((resolve) => {
        try {
          const u = dgram.createSocket('udp4');
          const done = (v) => { try { u.close(); } catch {} resolve(v); };
          u.once('error', () => done(true));
          u.send(Buffer.from('x'), 53, '1.1.1.1', (e) => done(!!e));
          setTimeout(() => done(false), 3000);
        } catch { resolve(true); }
      }) : Promise.resolve(null);
      Promise.all([tcp, udp]).then(([t, u]) => { r.tcpBlocked = t; r.udpBlocked = u; finish(); });
    `;
    const env = {
      ...process.env,
      TMPDIR: cap.sessionTmp,
      TEMP: cap.sessionTmp,
      TMP: cap.sessionTmp,
      NODE_DISABLE_COMPILE_CACHE: '1',
      OPENSSL_CONF: opensslConf,
      TZ: 'UTC',
      ...(nodeSharedLibDirs(process.execPath).length
        ? {
            LD_LIBRARY_PATH: [...nodeSharedLibDirs(process.execPath), process.env.LD_LIBRARY_PATH]
              .filter(Boolean)
              .join(path.delimiter),
          }
        : {}),
    };
    let res: ReturnType<typeof spawnSync> | undefined;
    for (let i = 1; i <= 3; i++) {
      res = spawnSync(landstripBin, ['-p', policyFile, process.execPath, '-e', probe], {
        encoding: 'utf8',
        env,
        timeout: 30000,
      });
      if (res.status !== null) break; // null = signal-killed/timed out — retry
      process.stderr.write(`[landstrip-probe] attempt ${i}/3 signal-killed (${res.signal}), retrying\n`);
    }
    if (res?.status !== 0) process.stderr.write(`[landstrip-probe] status=${res?.status} stderr=${res?.stderr}\n`);
    return res?.status === 0;
  } finally {
    fs.rmSync(secretDir, { recursive: true, force: true });
  }
};

// The installed @landstrip scope dir, so the no-backend tests below can hide it.
// null when the optional dependency was never installed — that host already IS the
// no-backend case and needs no hiding.
const landstripScopeDir = ((): string | null => {
  try {
    const entry = nodeRequire.resolve('@landstrip/landstrip');
    const marker = `${path.sep}@landstrip${path.sep}`;
    const at = entry.indexOf(marker);
    return at === -1 ? null : entry.slice(0, at + marker.length - 1);
  } catch {
    return null;
  }
})();
const landstripHiddenDir = landstripScopeDir ? `${landstripScopeDir}.hidden-by-e2e` : null;

describe.runIf(['linux', 'darwin', 'win32'].includes(plat) && landstripBinPath !== null)(
  `Kernel confinement — ${plat} (--sandbox-strict)`,
  () => {
    let tools: ToolsWork;
    beforeAll(async () => {
      tools = await runAllTools();
    });

    it('serves all 5 tools under the sandbox (kernel confinement does not break them)', () => {
      expect(tools).toMatchObject(ALL_TOOLS_WORK);
    });

    it('kernel-enforces the policy a real launch wrote: blocks outside read, workspace write, and network — bypassing the path guard', async () => {
      const ws = mkWorkspace();
      const tmpParent = realpath(fs.mkdtempSync(path.join(os.tmpdir(), 'rpx-strict-tmp-')));
      try {
        const cap = await captureServerPolicy(ws, tmpParent);
        expect(await kernelEnforcesCapturedPolicy(landstripBinPath as string, ws, cap)).toBe(true);
      } finally {
        fs.rmSync(ws, { recursive: true, force: true });
        fs.rmSync(tmpParent, { recursive: true, force: true });
      }
    });
  },
);

// The CLI refusal contracts' only home (deliberately no mock-based unit twins),
// proven on the built binary. The refusals fire before any kernel backend loads,
// so these run on every platform, with or without landstrip.
describe('CLI fail-closed contracts (built server, any platform)', () => {
  it('--sandbox-strict without --mcp refuses with exit 1, the error on stderr, and no pack output', () => {
    const ws = mkWorkspace();
    try {
      const res = spawnSync(process.execPath, [bin, '--sandbox-strict'], {
        cwd: ws,
        encoding: 'utf8',
        timeout: 30000,
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toMatch(/--sandbox-strict requires --mcp/);
      // No pack output on disk — an unconfined pack is the fail-open this flag forbids.
      expect(fs.existsSync(path.join(ws, 'repomix-output.xml'))).toBe(false);
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });

  it('--sandbox and --sandbox-strict together refuse with exit 1 (mutually exclusive — one way per confinement level)', () => {
    const ws = mkWorkspace();
    try {
      const res = spawnSync(process.execPath, [bin, '--mcp', '--sandbox', '--sandbox-strict'], {
        cwd: ws,
        encoding: 'utf8',
        timeout: 30000,
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toMatch(/--sandbox and --sandbox-strict are mutually exclusive/);
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });
});

// Simulates a host with no kernel backend by hiding the installed helper, restoring
// it afterwards. Must stay the last describe — the tests above need it present.
describe('with no kernel backend available', () => {
  // Idempotent, and also armed on exit/interrupt: a killed run (timeout, Ctrl+C, CI
  // cancellation) must not leave the developer's node_modules missing the helper.
  const restoreLandstrip = (): void => {
    if (!landstripScopeDir || !landstripHiddenDir) return;
    if (fs.existsSync(landstripHiddenDir) && !fs.existsSync(landstripScopeDir)) {
      fs.renameSync(landstripHiddenDir, landstripScopeDir);
    }
  };

  beforeAll(() => {
    restoreLandstrip(); // in case an earlier run was killed mid-test
    if (landstripScopeDir && landstripHiddenDir) fs.renameSync(landstripScopeDir, landstripHiddenDir);
    process.once('exit', restoreLandstrip);
    process.once('SIGINT', restoreLandstrip);
    process.once('SIGTERM', restoreLandstrip);
  });
  afterAll(() => {
    restoreLandstrip();
    process.off('exit', restoreLandstrip);
    process.off('SIGINT', restoreLandstrip);
    process.off('SIGTERM', restoreLandstrip);
  });

  it('--sandbox-strict refuses to start: exit 1, refusal on stderr, never serves', () => {
    const ws = mkWorkspace();
    try {
      const res = spawnSync(process.execPath, [bin, '--mcp', '--sandbox-strict'], {
        cwd: ws,
        encoding: 'utf8',
        timeout: 30000,
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toMatch(/Kernel sandbox unavailable/);
      expect(res.stderr).toMatch(/Refusing to start/);
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });

  it('plain --sandbox still serves all tools — the portable path never needs the backend', async () => {
    const ws = mkWorkspace();
    try {
      const { client } = await connect(ws, { args: ['--mcp', '--sandbox'] });
      try {
        const { tools } = await client.listTools();
        expect(tools.length).toBe(5);
        const rf = textOf(await client.callTool({ name: 'file_system_read_file', arguments: { path: 'src/a.ts' } }));
        expect(rf).toContain('answer = 42');
      } finally {
        await client.close().catch(() => {});
      }
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });
});
