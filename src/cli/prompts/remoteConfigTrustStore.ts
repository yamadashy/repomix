import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pc from 'picocolors';
import { parseRemoteValue } from '../../core/git/gitRemoteParse.js';
import { writeStderrLine as writeErr } from '../../shared/stderrWrite.js';
import { getRepomixTmpDir } from '../../shared/tmpDir.js';

// Persistence for the "don't ask again for this repository" answer given to the
// remote-config trust prompt (see remoteConfigTrustPrompt.ts). Kept separate from
// the prompt itself because this half is security-sensitive on-disk state with its
// own ownership/permission rules.
//
// Markers live under $TMPDIR/repomix/trusted-remotes/. Each marker is named
// sha256(normalized clone URL) and its CONTENT is sha256(the config file's bytes),
// so a remote that later ships a different config file re-prompts (the direnv
// model). The dir shares the ephemeral repomix/ umbrella (see shared/tmpDir.ts):
// a decision survives across runs but decays when the OS clears the temp dir, which
// is acceptable and fail-closed for a consent cache.
//
// Scope of the pin: it covers the entry config file only. A `.ts`/`.js` config can
// import sibling modules, and `input.processors` runs external scripts; neither is
// hashed, so a trusted repo can change those while the entry file stays identical.
// The prompt labels code configs as executable for this reason.
const TRUST_SUBDIR_NAME = 'trusted-remotes';

export const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

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
// `lstat` (not `stat`) so a symlinked store dir is rejected outright rather than
// letting our chmod/write follow it into a directory we do not own.
// POSIX only; on Windows (uid -1) the uid/mode model does not apply, so we skip the
// check. The net effect is acceptable there because os.tmpdir() is already per-user
// (%TEMP% / %LOCALAPPDATA%), so another account cannot seed markers into our store.
const isDirSafe = async (dir: string, deps: { lstat: typeof fs.lstat }): Promise<boolean> => {
  try {
    const stats = await deps.lstat(dir);
    if (stats.isSymbolicLink() || !stats.isDirectory()) return false;
    if (process.platform === 'win32') return true;
    const uid = os.userInfo().uid;
    if (uid >= 0 && stats.uid !== uid) return false;
    if ((stats.mode & 0o022) !== 0) return false;
    return true;
  } catch {
    return false;
  }
};

// The shared parent umbrella is checked too: $TMPDIR/repomix is created by whichever
// consumer runs first (token cache, MCP outputs) under the default umask, so on a
// multi-user /tmp it can be attacker-creatable even when our own subdir looks fine.
const isStoreDirSafe = async (deps: { lstat: typeof fs.lstat }): Promise<boolean> =>
  (await isDirSafe(getRepomixTmpDir(), deps)) && (await isDirSafe(getTrustStoreDir(), deps));

export const isRemoteConfigTrusted = async (
  repoUrl: string,
  configDigest: string,
  deps = { lstat: fs.lstat, readFile: fs.readFile },
): Promise<boolean> => {
  if (!(await isStoreDirSafe(deps))) return false;
  try {
    const stored = await deps.readFile(markerPathForUrl(repoUrl), 'utf8');
    // Content-pinned: only trust when the config file is byte-for-byte what the
    // user approved before.
    return stored.trim() === configDigest;
  } catch {
    return false;
  }
};

export const markRemoteConfigTrusted = async (
  repoUrl: string,
  configDigest: string,
  deps = { mkdir: fs.mkdir, chmod: fs.chmod, writeFile: fs.writeFile, lstat: fs.lstat },
): Promise<void> => {
  // Remembering the decision is best-effort: the user has already consented, so a
  // failure here (ENOSPC, EACCES, a hostile store dir) must never abort the pack.
  try {
    const dir = getTrustStoreDir();
    await deps.mkdir(dir, { recursive: true, mode: 0o700 });
    // Verify ownership BEFORE touching the directory: chmod-ing first would follow a
    // symlink planted by another user and re-mode a directory we do not own.
    if (!(await isStoreDirSafe(deps))) {
      writeErr(pc.dim('Note: could not remember trust (the trust store directory is not owned by the current user).'));
      return;
    }
    // mkdir does not tighten an existing dir's mode, so enforce it now that the dir
    // is known to be ours.
    await deps.chmod(dir, 0o700);
    await deps.writeFile(markerPathForUrl(repoUrl), configDigest, { mode: 0o600 });
  } catch (error) {
    writeErr(pc.dim(`Note: could not remember trust (${error instanceof Error ? error.message : String(error)}).`));
  }
};
