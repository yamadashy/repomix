import { logger } from '../../shared/logger.js';
import { isSandboxToken, SANDBOX_TOKEN_ENV, type SandboxBackend, stripHostEnv } from './shared.js';

/**
 * Kernel-enforced confinement for `repomix --mcp --sandbox-strict`, layered on the
 * software path guard. The kernel sandbox is REQUIRED: no available backend, or a
 * failure to apply it, means the server refuses to start — never a silent fallback.
 */

// Imported lazily so plain `--mcp` / `--sandbox` launches never load the backend.
export const loadBackend = async (): Promise<SandboxBackend | null> => {
  const { landstripBackend } = await import('./landstrip.js');
  return landstripBackend.isAvailable() ? landstripBackend : null;
};

// Injectable seams so the fail-closed contract can be unit-tested without a real
// kernel sandbox (which would confine the test worker) or a real process.exit.
export interface SandboxDeps {
  loadBackend: () => Promise<SandboxBackend | null>;
  isConfinedChild: () => boolean;
  processExit: (code?: number) => never;
}

const defaultDeps = (): SandboxDeps => ({
  loadBackend: () => loadBackend(),
  // The token, never REPOMIX_SANDBOXED: a stray inherited "1" must not convince us
  // we are already confined and serve unprotected.
  isConfinedChild: () => isSandboxToken(process.env[SANDBOX_TOKEN_ENV]),
  processExit: process.exit,
});

/**
 * Enter the kernel sandbox, then serve. Returns only when we ARE the confined child;
 * otherwise it re-execs one and exits, or exits 1 rather than run unconfined.
 */
export const applySandboxOrExit = async (opts: { root: string }, deps: SandboxDeps = defaultDeps()): Promise<void> => {
  const refuse = (why: string): never => {
    logger.error(
      `Kernel sandbox unavailable (${why}). Refusing to start (--sandbox-strict requires a kernel sandbox).`,
    );
    return deps.processExit(1);
  };

  if (deps.isConfinedChild()) {
    // Host secrets the kernel cannot hide go now, before anything is served.
    stripHostEnv();
    return;
  }

  // Warned in the parent only, on stderr: the child's stdout is the MCP JSON-RPC stream.
  logger.error(
    '--sandbox-strict is EXPERIMENTAL: the kernel sandbox is not yet validated on every platform and relies on a pre-1.0 dependency. The always-on --sandbox software path guard is the stable option.',
  );

  // Caught so an unexpected module-load error fails closed rather than surfacing as
  // an unhandled rejection.
  const backend = await deps.loadBackend().catch((error) => {
    refuse(`backend load failed (${error instanceof Error ? error.message : String(error)})`);
    return null;
  });
  if (!backend) {
    refuse(`no kernel sandbox backend on ${process.platform}`);
    return;
  }
  if (!backend.isAvailable()) {
    refuse(`${backend.name} unavailable on this host`);
    return;
  }

  try {
    // Awaited so a rejected apply is caught here and fails closed; in production this
    // never resolves (the backend re-execs and exits).
    await backend.confine(opts.root);
  } catch (error) {
    refuse(`${backend.name} failed to apply (${error instanceof Error ? error.message : String(error)})`);
  }
};
