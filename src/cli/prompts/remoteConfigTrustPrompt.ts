import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pc from 'picocolors';
import { findLocalConfigPath } from '../../config/configLoad.js';
import { parseRemoteValue } from '../../core/git/gitRemoteParse.js';
import { OperationCancelledError, RepomixError } from '../../shared/errorHandle.js';
import { getRepomixTmpDir } from '../../shared/tmpDir.js';

// "Always trust" markers live under $TMPDIR/repomix/trusted-remotes/. Each marker
// is named sha256(normalized clone URL) and its CONTENT is sha256(config bytes):
// trust is pinned to the exact config content, so a trusted remote that later ships
// a different config re-prompts (the direnv model). The dir shares the ephemeral
// repomix/ umbrella (see shared/tmpDir.ts), so a decision survives across runs but
// decays when the OS clears the temp dir — acceptable and fail-closed for a consent
// cache.
const TRUST_SUBDIR_NAME = 'trusted-remotes';

// Cap how much of the config we echo so a huge file cannot bury the interesting
// part or flood the terminal. The user is told when it is truncated.
const MAX_DISPLAY_BYTES = 8 * 1024;

// Config extensions that execute on load (jiti): the shown text is not the whole
// story, so we label these as executable code rather than implying a full audit.
const CODE_CONFIG_RE = /\.(ts|mts|cts|js|mjs|cjs)$/;

export type RemoteTrustChoice = 'once' | 'always' | 'no';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const getTrustStoreDir = (): string => path.join(getRepomixTmpDir(), TRUST_SUBDIR_NAME);

const normalizeRemoteKey = (repoUrl: string): string => {
  // Hash the same canonical clone URL used for cloning so shorthand/https map to
  // one marker. Fall back to the raw value if parsing fails (causes re-prompting,
  // which is fail-closed).
  try {
    return parseRemoteValue(repoUrl).repoUrl;
  } catch {
    return repoUrl;
  }
};

const markerPathForUrl = (repoUrl: string): string =>
  path.join(getTrustStoreDir(), sha256(normalizeRemoteKey(repoUrl)));

// On a shared host, /tmp/repomix/trusted-remotes could be pre-created by another
// local user who seeds markers to suppress this consent prompt. Require the dir to
// be owned by us and not group/world-writable before honoring or writing markers.
// POSIX only; on Windows (uid -1) the uid/mode model does not apply, so we skip it.
const isStoreDirSafe = async (deps: { stat: typeof fs.stat }): Promise<boolean> => {
  try {
    const stats = await deps.stat(getTrustStoreDir());
    if (!stats.isDirectory()) return false;
    if (process.platform === 'win32') return true;
    const uid = os.userInfo().uid;
    if (uid >= 0 && stats.uid !== uid) return false;
    if ((stats.mode & 0o022) !== 0) return false;
    return true;
  } catch {
    return false;
  }
};

export const isRemoteConfigTrusted = async (
  repoUrl: string,
  configDigest: string,
  deps = { stat: fs.stat, readFile: fs.readFile },
): Promise<boolean> => {
  if (!(await isStoreDirSafe(deps))) return false;
  try {
    const stored = await deps.readFile(markerPathForUrl(repoUrl), 'utf8');
    // Content-pinned: only trust when the remote's config is byte-for-byte what
    // the user approved before.
    return stored.trim() === configDigest;
  } catch {
    return false;
  }
};

export const markRemoteConfigTrusted = async (
  repoUrl: string,
  configDigest: string,
  deps = { mkdir: fs.mkdir, chmod: fs.chmod, writeFile: fs.writeFile, stat: fs.stat },
): Promise<void> => {
  const dir = getTrustStoreDir();
  await deps.mkdir(dir, { recursive: true, mode: 0o700 });
  // mkdir does not tighten an existing dir's mode; enforce it best-effort, then
  // verify ownership before writing so we never seed a marker into an
  // attacker-controlled directory.
  try {
    await deps.chmod(dir, 0o700);
  } catch {
    // Filesystems without chmod (e.g. some Windows setups) fall back to the check.
  }
  if (!(await isStoreDirSafe(deps))) {
    writeErr(pc.dim('Note: could not remember trust — the trust store directory is not owned by the current user.'));
    return;
  }
  await deps.writeFile(markerPathForUrl(repoUrl), configDigest, { mode: 0o600 });
};

// Interactivity is judged on stdin+stderr, never stdout: `--stdout` pipes the
// packed output through stdout, so gating on stdout.isTTY would silently trust a
// piped run — exactly the case we want to prompt in.
const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stderr.isTTY);

// All trust messaging goes to stderr so it never mixes into `--stdout` output.
const writeErr = (line = ''): void => {
  process.stderr.write(`${line}\n`);
};

const loadClack = async () => {
  const p = await import('@clack/prompts');
  return { select: p.select, isCancel: p.isCancel, cancel: p.cancel };
};

export interface ConfirmRemoteConfigTrustOptions {
  repoDir: string;
  repoUrl: string;
  force: boolean;
  stdout: boolean;
  hasExplicitConfig: boolean;
}

export type ConfirmRemoteConfigTrustDeps = {
  findLocalConfigPath: typeof findLocalConfigPath;
  readFile: typeof fs.readFile;
  isRemoteConfigTrusted: typeof isRemoteConfigTrusted;
  markRemoteConfigTrusted: typeof markRemoteConfigTrusted;
  isInteractive: typeof isInteractive;
  loadClack: typeof loadClack;
};

/**
 * Interactively confirm before a cloned remote repository's config is trusted
 * (via `--remote-trust-config` / `REPOMIX_REMOTE_TRUST_CONFIG`). Shows the config
 * that is about to run, then asks the user. Throws `OperationCancelledError` when
 * the user declines.
 *
 * Proceeds without prompting when: `--force` is passed, the shell is
 * non-interactive (CI/pipes — preserves the historical behavior so automations do
 * not hang), the remote's exact config is already trusted, an absolute `--config`
 * is in use, or the cloned repo has no config to load.
 */
export const confirmRemoteConfigTrust = async (
  options: ConfirmRemoteConfigTrustOptions,
  deps: ConfirmRemoteConfigTrustDeps = {
    findLocalConfigPath,
    readFile: fs.readFile,
    isRemoteConfigTrusted,
    markRemoteConfigTrusted,
    isInteractive,
    loadClack,
  },
): Promise<void> => {
  const { repoDir, repoUrl, force, stdout, hasExplicitConfig } = options;

  // An absolute --config was supplied: the cloned repo's own config is never
  // loaded (enforced in remoteAction), so there is nothing to confirm.
  if (hasExplicitConfig) return;

  const configPath = await deps.findLocalConfigPath(repoDir);
  if (!configPath) return; // no config in the cloned repo → nothing is trusted

  // --force skips all confirmation prompts (explicit intent, responsibility on the caller).
  if (force) return;

  const configName = path.basename(configPath);

  // Non-interactive (CI, pipes): keep the historical non-prompting behavior so
  // existing --remote-trust-config automations do not hang. Announce it on stderr.
  if (!deps.isInteractive()) {
    writeErr(pc.dim(`Trusting remote config non-interactively: ${configName} (${repoUrl})`));
    return;
  }

  const configBytes = await deps.readFile(configPath, 'utf8');
  const configDigest = sha256(configBytes);

  // Already trusted for this exact config content.
  if (await deps.isRemoteConfigTrusted(repoUrl, configDigest)) return;

  // The interactive prompt renders to the terminal; under --stdout the packed
  // output is written to stdout and the two collide. Refuse rather than silently
  // trust or corrupt the piped output.
  if (stdout) {
    throw new RepomixError(
      `Reviewing the remote repository's config (${configName}) needs an interactive prompt, which conflicts with --stdout.\n` +
        '  Re-run without --stdout to review it, or pass --force to skip the prompt (you accept running the remote config).',
    );
  }

  const isCode = CODE_CONFIG_RE.test(configName);
  const truncated = Buffer.byteLength(configBytes, 'utf8') > MAX_DISPLAY_BYTES;
  const shown = truncated ? `${configBytes.slice(0, MAX_DISPLAY_BYTES)}\n... (truncated)` : configBytes;

  writeErr();
  writeErr(pc.yellow(pc.bold(`⚠ ${repoUrl} ships a config file that will be trusted: ${configName}`)));
  if (isCode) {
    writeErr(pc.yellow('  This is executable code — loading it runs arbitrary commands on your machine.'));
  } else {
    writeErr(pc.dim('  A trusted config can run arbitrary commands (input.processors) and read local files.'));
  }
  writeErr(pc.dim('─'.repeat(72)));
  writeErr(shown);
  writeErr(pc.dim('─'.repeat(72)));
  writeErr();

  const clack = await deps.loadClack();
  const choice = await clack.select({
    message: "Trust and run this repository's config?",
    options: [
      { value: 'once' as RemoteTrustChoice, label: 'Yes, once' },
      {
        value: 'always' as RemoteTrustChoice,
        label: "Yes, and don't ask again for this repository",
        hint: 'remembered until temp files are cleared',
      },
      { value: 'no' as RemoteTrustChoice, label: 'No, do not run' },
    ],
    initialValue: 'no' as RemoteTrustChoice,
  });

  if (clack.isCancel(choice) || choice === 'no') {
    clack.cancel('Aborted: remote config was not trusted.');
    throw new OperationCancelledError('Remote config not trusted');
  }

  if (choice === 'always') {
    await deps.markRemoteConfigTrusted(repoUrl, configDigest);
  }
  // 'once' or 'always' → proceed
};
