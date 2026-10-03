import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { logger } from '../../shared/logger.js';
import { makeSandboxToken, SANDBOX_TOKEN_ENV, SANDBOXED_ENV } from '../../shared/sandboxEnv.js';
import { buildRuleset, makeSessionTmp, nodeSharedLibDirs, type SandboxBackend, spawnConfinedChild } from './shared.js';

/**
 * The kernel-sandbox backend for `repomix --mcp --sandbox-strict`, on every OS,
 * delegating to the prebuilt `landstrip` helper (Landlock + seccomp on Linux,
 * Seatbelt on macOS, AppContainer on Windows). It applies the sandbox in its OWN
 * process before exec'ing the confined server, so a fault can only fail the launch —
 * never silently under-confine a running server the way in-process FFI could.
 *
 * When the platform binary is absent there is no fallback: the caller fails closed.
 */

// macOS symlinks /var and /tmp under /private and Seatbelt matches the kernel-resolved
// path, so the session temp must be granted canonically or writes to it are denied.
// The workspace root arrives already canonicalized from cliRun.
const canon = (p: string): string => {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
};

const nodeRequire = createRequire(import.meta.url);

/**
 * Binary path for this platform, or null when the optional dependency is absent
 * (musl, an unsupported arch, an --omit=optional install). The single probe — the
 * e2e suites import it too, so availability detection cannot drift.
 */
export const landstripBinaryPath = (): string | null => {
  try {
    return (nodeRequire('@landstrip/landstrip') as { binaryPath: () => string }).binaryPath();
  } catch {
    return null;
  }
};

/**
 * Translate a {@link buildRuleset} result into a landstrip policy. `denyRead: "/"`
 * switches reads to an allowlist; writable paths must also be listed as readable.
 * Omitting the `network` section is what denies network — TCP and UDP alike.
 *
 * `windows.appContainerMode: "standard"`: landstrip's default LPAC AppContainer
 * blocks loading the Winsock stack, so node aborts at startup (WSAStartup 10107).
 * Standard mode reaches the ALL APPLICATION PACKAGES system DLLs node needs while
 * still granting no network capability. Inert on Linux/macOS.
 */
export const buildLandstripPolicy = (readOnly: string[], readWrite: string[]): string => {
  // Path fields are newline-delimited, so an embedded newline would split into bogus
  // entries. Dropping such a path fails closed (landstrip denies what is unlisted)
  // rather than corrupting the policy into a silent under/over-grant.
  const noNewline = (paths: string[]): string[] => paths.filter((p) => !p.includes('\n'));
  return JSON.stringify({
    filesystem: {
      denyRead: '/',
      allowRead: noNewline([...readOnly, ...readWrite]).join('\n'),
      allowWrite: noNewline(readWrite).join('\n'),
    },
    windows: { appContainerMode: 'standard' },
  });
};

export const landstripBackend: SandboxBackend = {
  name: 'landstrip',
  isAvailable: () => landstripBinaryPath() !== null,
  async confine(root: string): Promise<void> {
    const bin = landstripBinaryPath();
    if (!bin) throw new Error('landstrip binary unavailable for this platform');

    const sessionTmp = canon(makeSessionTmp());
    const libDirs = nodeSharedLibDirs(process.execPath);
    let policyFile: string;
    let opensslConf: string;
    try {
      const { readOnly, readWrite } = buildRuleset(root, sessionTmp, libDirs);
      policyFile = path.join(sessionTmp, 'landstrip-policy.json');
      fs.writeFileSync(policyFile, buildLandstripPolicy(readOnly, readWrite));

      // node aborts at startup if OpenSSL's config is unreadable, so give it an empty
      // one inside the session tmp rather than granting host /etc.
      opensslConf = path.join(sessionTmp, 'openssl.cnf');
      fs.writeFileSync(opensslConf, '');
    } catch (error) {
      // The refusal path must not leave the just-created session dir behind — in the
      // in-workspace-TMPDIR case it would sit inside the user's repo.
      fs.rmSync(sessionTmp, { recursive: true, force: true });
      throw error;
    }

    // execArgv is forwarded so node CLI flags (e.g. --max-old-space-size) survive
    // the re-exec.
    logger.trace(`Confining via landstrip (${bin}); session tmp ${sessionTmp}`);
    await spawnConfinedChild(
      bin,
      ['-p', policyFile, process.execPath, ...process.execArgv, ...process.argv.slice(1)],
      {
        ...process.env,
        [SANDBOXED_ENV]: '1',
        [SANDBOX_TOKEN_ENV]: makeSandboxToken(),
        // os.tmpdir() reads these; anything else falls outside the only writable grant.
        TMPDIR: sessionTmp,
        TEMP: sessionTmp,
        TMP: sessionTmp,
        NODE_DISABLE_COMPILE_CACHE: '1',
        OPENSSL_CONF: opensslConf,
        // Pinned: a named host zone would make libc reach for /usr/share/zoneinfo
        // (not granted) and silently fall back to UTC anyway.
        TZ: 'UTC',
        // Without the host /etc/ld.so.cache the loader needs these on its search path.
        ...(libDirs.length ? { LD_LIBRARY_PATH: libDirs.join(path.delimiter) } : {}),
      },
      // Removed on exit so no copy of the packed workspace is left behind.
      () => fs.rmSync(sessionTmp, { recursive: true, force: true }),
    );
  },
};
