import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../shared/logger.js';
import { SANDBOX_TOKEN_ENV, SANDBOXED_ENV } from '../../shared/sandboxEnv.js';

// Building blocks for the --sandbox-strict kernel sandbox, shared between sandbox.ts
// (fail-closed dispatch) and its sole backend, landstrip.ts. The confinement env
// contract (marker + proof token) lives in src/shared/sandboxEnv.ts.

/**
 * The two grant levels the backend policy can express. Every listed path is
 * readable; `readWrite` is the subset that is also writable. There is no separate
 * execute grant — loading and running the node runtime rides on the read grant.
 */
export interface SandboxRuleset {
  /** Readable, never writable: the node runtime, its deps, and the workspace. */
  readOnly: string[];
  /** Readable and writable: the session temp dir — the only writable grant. */
  readWrite: string[];
}

/** The kernel-sandbox backend (adapter interface; landstrip is the sole implementation). */
export interface SandboxBackend {
  readonly name: string;
  /** Probe only — never restricts. */
  isAvailable(): boolean;
  /**
   * Confine `root`, then serve. Never resolves in production: the implementation
   * re-execs a confined child and exits with its code. Reject to signal an apply
   * failure — the caller treats it as fatal.
   */
  confine(root: string): Promise<void>;
}

const existing = (paths: string[]): string[] => paths.filter((p) => p && fs.existsSync(p));

/**
 * How to make this platform's dynamic loader report what the node binary actually
 * loads. Asking the loader keeps the grants correct on any layout — distro, macOS
 * version, or install method — where a hardcoded path list would rot. Windows has no
 * entry: landstrip's ALL APPLICATION PACKAGES baseline already covers its system DLLs.
 *
 * The grants are deliberately narrow: no host `/etc` (config and secrets — `passwd`,
 * `ssl`/`pki`, `resolv.conf` for DNS recon) and no `/proc` (memory diagnostics degrade
 * gracefully without it, and it would expose other same-user processes' `environ`).
 */
const LOADER_PROBES: Partial<Record<NodeJS.Platform, { env: NodeJS.ProcessEnv; args: string[] }>> = {
  linux: { env: { LD_TRACE_LOADED_OBJECTS: '1' }, args: [] },
  darwin: { env: { DYLD_PRINT_LIBRARIES: '1' }, args: ['-e', ''] },
};

/**
 * Spawn the confined child, forward termination signals to it, run `onExit` once,
 * then exit with the child's code. Never settles — the process ends from a handler.
 *
 * Deliberately not spawnSync: the MCP client stops the server by SIGTERM-ing this
 * wrapper parent, and a parent blocked in spawnSync runs no handler — the temp-dir
 * cleanup would never fire (leaking a full pack copy under /tmp) and the confined
 * child would be orphaned.
 */
export const spawnConfinedChild = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  onExit: () => void,
): Promise<never> => {
  const child = childProcess.spawn(command, args, { stdio: 'inherit', env });
  const forwardable: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  const handlers = forwardable.map((sig) => {
    const handler = (): void => {
      try {
        child.kill(sig);
      } catch {
        // child already gone
      }
    };
    process.on(sig, handler);
    return [sig, handler] as const;
  });
  const finish = (code: number): void => {
    for (const [sig, handler] of handlers) process.off(sig, handler);
    try {
      onExit();
    } catch {
      // best-effort cleanup
    }
    process.exit(code);
  };
  return new Promise<never>(() => {
    child.on('error', (error) => {
      logger.error(`Sandbox re-exec failed: ${error.message}`);
      finish(1);
    });
    // A child killed by a signal reports code=null → surface a non-zero exit.
    child.on('exit', (code, signal) => finish(signal ? 1 : (code ?? 1)));
  });
};

/** Fresh per-session temp dir (holds pack output; the only writable grant). */
export const makeSessionTmp = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'repomix-sbx-'));

/**
 * Variables the confined server keeps: the ones the backend sets for it, read after
 * startup (os.tmpdir(), Date). This is our own namespace, not a guess about what a
 * platform needs — everything else is dropped.
 */
const CONFINED_ENV_KEEP = [
  SANDBOX_TOKEN_ENV,
  SANDBOXED_ENV,
  'TMPDIR',
  'TEMP',
  'TMP',
  'TZ',
  'OPENSSL_CONF',
  'LD_LIBRARY_PATH',
  'NODE_DISABLE_COMPILE_CACHE',
];

/**
 * Drop the host environment from the confined server, in place, before it serves.
 * The kernel denies it files and network but cannot hide environment variables, so an
 * inherited AWS_SECRET_ACCESS_KEY or GITHUB_TOKEN would otherwise sit in a process
 * whose stdout is the agent's JSON-RPC stream. What survives is what the backend set
 * for this process, plus a PATH and HOME rebuilt from the runtime itself.
 *
 * Done here rather than by handing the launcher a filtered environment: the launcher
 * has no way to set the child's environment separately from its own, and it needs the
 * host's to build the sandbox (Windows fails at CreateProcess with error 203 without
 * it). The residue is that secrets exist in this process during startup — before any
 * client request is served, and gone from `process.env` by the time one is.
 */
export const stripHostEnv = (): void => {
  // Derived before the strip: os.homedir() reads env vars that are about to go.
  const derived = { PATH: path.dirname(process.execPath), HOME: os.homedir() };
  // Windows env names are case-insensitive, so compare that way everywhere.
  const keep = new Set(CONFINED_ENV_KEEP.map((name) => name.toLowerCase()));
  for (const name of Object.keys(process.env)) {
    if (!keep.has(name.toLowerCase())) delete process.env[name];
  }
  Object.assign(process.env, derived);
};

// <pkg>/{lib|src}/mcp/sandbox/shared.js → root = ../../.. Derived from this module's
// own location so it resolves under an npm-linked/global install.
const packageRoot = (): string => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Every `node_modules` on Node's resolution walk from `fromDir` up to the fs root.
 * In a flat-hoisted layout (npx cache, pnpm, project-local install) repomix's deps
 * are SIBLINGS of the package dir, not nested under it, so granting only
 * packageRoot() would kill the confined child with ERR_MODULE_NOT_FOUND — including
 * on the headline `npx -y repomix --mcp --sandbox-strict` launch.
 */
export const nodeModulesPaths = (fromDir: string): string[] => {
  const out: string[] = [];
  let cur = path.resolve(fromDir);
  for (;;) {
    out.push(path.join(cur, 'node_modules'));
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return out;
};

/**
 * The interpreter itself: the binary, plus the directory holding it for the runtime
 * files installs place beside it (Windows DLLs). Everything else it needs comes from
 * the loader ({@link nodeSharedLibDirs}) — no install prefix is granted, so co-located
 * host config and secrets (…/etc, a node under $HOME) stay kernel-blocked.
 */
export const nodeRuntimePaths = (execPath: string): string[] => [execPath, path.dirname(execPath)];

/**
 * Parse loader output into the dirs holding the libraries it reported. Handles the
 * ldd shape (`soname => /abs/path (0x…)`, plus the loader's own `/abs/ld.so (0x…)`)
 * and the dyld shape (any absolute `.dylib` path on the line). Lines with no resolved
 * path — the vDSO, `not found`, a static binary — yield nothing.
 */
export const parseLoaderTrace = (output: string): string[] => {
  const dirs = new Set<string>();
  for (const raw of output.split('\n')) {
    const line = raw.trim();
    const m =
      line.match(/=>\s*(\/\S+)\s+\(0x[0-9a-f]+\)/i) ??
      line.match(/^(\/\S+)\s+\(0x[0-9a-f]+\)/i) ??
      line.match(/(\/\S+\.dylib)\b/);
    if (m) dirs.add(path.dirname(m[1]));
  }
  return [...dirs];
};

/**
 * Dirs of the shared libraries node loads, asked of this host's own loader (see
 * {@link LOADER_PROBES}) instead of guessed — layouts differ across distros (Ubuntu
 * multiarch, Fedora lib64, Alpine musl, NixOS) and macOS versions alike. On Linux the
 * confined child re-resolves them without the host `/etc/ld.so.cache`, so confine()
 * both grants these dirs and puts them on LD_LIBRARY_PATH.
 * `[]` where there is no probe or the binary is static — the other grants stand.
 */
export const nodeSharedLibDirs = (execPath: string): string[] => {
  const probe = LOADER_PROBES[process.platform];
  if (!probe) return [];
  try {
    const res = childProcess.spawnSync(execPath, probe.args, {
      env: { ...process.env, ...probe.env },
      encoding: 'utf8',
      timeout: 5000,
      maxBuffer: 4 * 1024 * 1024,
    });
    // dyld reports on stderr, ld.so on stdout.
    return parseLoaderTrace(`${res.stdout ?? ''}\n${res.stderr ?? ''}`);
  } catch {
    return [];
  }
};

/**
 * The confined process's ruleset: its runtime and the workspace read-only, the
 * session temp read-write — so even a path-guard bypass cannot write the workspace
 * or reach host secrets at the kernel level.
 * Non-existent paths are dropped. Both `root` and `sessionTmp` must arrive
 * canonicalized (they do: cliRun canonicalizes the root, confine() the session tmp).
 */
export const buildRuleset = (root: string, sessionTmp: string, libDirs: string[]): SandboxRuleset => {
  const rootAbs = path.resolve(root);
  // A host TMPDIR/TEMP/TMP pointing into the workspace would make the session tmp —
  // the ONLY writable grant — a subtree of the root the policy promises is
  // read-only. No relocation guesswork: refuse, and the launch fails closed.
  const rootPrefix = rootAbs.endsWith(path.sep) ? rootAbs : `${rootAbs}${path.sep}`;
  if (sessionTmp === rootAbs || sessionTmp.startsWith(rootPrefix)) {
    throw new Error(
      `session temp dir ${sessionTmp} resolves inside the workspace root ${rootAbs}, which must stay read-only — unset TMPDIR/TEMP/TMP pointing into the workspace`,
    );
  }
  const readOnly = existing([
    ...nodeRuntimePaths(process.execPath),
    packageRoot(),
    ...nodeModulesPaths(packageRoot()),
    ...libDirs,
    rootAbs,
  ]);
  const readWrite = existing([sessionTmp]);
  return { readOnly, readWrite };
};
