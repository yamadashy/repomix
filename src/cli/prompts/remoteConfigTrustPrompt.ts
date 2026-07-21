import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import { findLocalConfigPath } from '../../config/configLoad.js';
import { OperationCancelledError, RepomixError } from '../../shared/errorHandle.js';
import { writeStderrLine as writeErr } from '../../shared/stderrWrite.js';
import { isRemoteConfigTrusted, markRemoteConfigTrusted, sha256 } from './remoteConfigTrustStore.js';

// Cap how much of the config we echo so a huge file cannot bury the interesting
// part or flood the terminal. The user is told when it is truncated.
const MAX_DISPLAY_BYTES = 8 * 1024;

// Config extensions that execute on load (jiti): the shown text is not the whole
// story (such a config can import sibling modules that are never displayed), so we
// label these as executable code rather than implying a full audit.
const CODE_CONFIG_RE = /\.(ts|mts|cts|js|mjs|cjs)$/;

// C0/C1 control characters, minus tab and newline which carry the config's real
// layout. Everything else is escaped before display.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point of this sanitizer
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

export type RemoteTrustChoice = 'once' | 'always' | 'no';

/**
 * Renders attacker-controlled text safely for a terminal. The config we echo is
 * fully controlled by the remote repository, so raw ANSI/VT sequences could scroll
 * away the warning printed above it, reposition the cursor to hide a dangerous line
 * such as `input.processors`, or push the real payload past the truncation cap while
 * the visible portion looks harmless. Any of those turns the review into a doctored
 * view and defeats the informed consent this prompt exists to obtain, so control
 * characters are escaped into a visible form rather than being emitted or dropped.
 */
const sanitizeForDisplay = (text: string): string =>
  text.replace(CONTROL_CHARS_RE, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`);

// Interactivity is judged on stdin+stderr, never stdout: `--stdout` pipes the
// packed output through stdout, so gating on stdout.isTTY would silently trust a
// piped run — exactly the case we want to prompt in.
export const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stderr.isTTY);

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
  lstat: typeof fs.lstat;
  realpath: typeof fs.realpath;
  isRemoteConfigTrusted: typeof isRemoteConfigTrusted;
  markRemoteConfigTrusted: typeof markRemoteConfigTrusted;
  isInteractive: typeof isInteractive;
  loadClack: typeof loadClack;
};

/**
 * Reject a config that is not a regular file inside the cloned repo. A repository
 * can ship `repomix.config.js` as a symlink (git preserves symlinks on POSIX), and
 * config resolution follows it. That would let the reviewed bytes come from outside
 * the owner-only temp dir: the content shown could be an unrelated local file, and
 * the target could be swapped between this read and the later load. Everything we
 * show the user must live in the tree we just cloned.
 */
const assertConfigIsContained = async (
  configPath: string,
  repoDir: string,
  deps: Pick<ConfirmRemoteConfigTrustDeps, 'lstat' | 'realpath'>,
): Promise<void> => {
  const configName = path.basename(configPath);
  const stats = await deps.lstat(configPath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new RepomixError(
      `Refusing to trust ${configName}: the remote repository's config must be a regular file, not a symlink.`,
    );
  }

  const [realConfigPath, realRepoDir] = await Promise.all([deps.realpath(configPath), deps.realpath(repoDir)]);
  const relative = path.relative(realRepoDir, realConfigPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new RepomixError(`Refusing to trust ${configName}: it resolves outside the cloned repository.`);
  }
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
    lstat: fs.lstat,
    realpath: fs.realpath,
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

  const configName = path.basename(configPath);

  // --force skips all confirmation prompts (explicit intent, responsibility on the
  // caller). It is a broad flag, so say what it suppressed rather than silently
  // granting a remote config the right to run.
  if (force) {
    writeErr(pc.dim(`Trusting remote config without review (--force): ${configName} (${repoUrl})`));
    return;
  }

  // Non-interactive (CI, pipes): keep the historical non-prompting behavior so
  // existing --remote-trust-config automations do not hang. Announce it on stderr.
  if (!deps.isInteractive()) {
    writeErr(pc.dim(`Trusting remote config non-interactively: ${configName} (${repoUrl})`));
    return;
  }

  // Only review a config that really lives inside the clone (see helper).
  await assertConfigIsContained(configPath, repoDir, deps);

  let configText: string;
  try {
    configText = await deps.readFile(configPath, 'utf8');
  } catch (error) {
    throw new RepomixError(
      `Could not read the remote repository's config (${configName}) for review: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const configDigest = sha256(configText);

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
  // Escape control characters first so the cap applies to what is actually printed,
  // then cap on bytes and slice on bytes: slicing the string would cut by UTF-16
  // code units and blow past the cap on multi-byte content.
  const displayText = sanitizeForDisplay(configText);
  const truncated = Buffer.byteLength(displayText, 'utf8') > MAX_DISPLAY_BYTES;
  const shown = truncated
    ? `${Buffer.from(displayText, 'utf8').subarray(0, MAX_DISPLAY_BYTES).toString('utf8')}\n... (truncated)`
    : displayText;

  writeErr();
  writeErr(
    pc.yellow(
      pc.bold(
        `⚠ ${sanitizeForDisplay(repoUrl)} ships a config file that will be trusted: ${sanitizeForDisplay(configName)}`,
      ),
    ),
  );
  if (isCode) {
    writeErr(pc.yellow('  This is executable code — loading it runs arbitrary commands on your machine.'));
  } else {
    writeErr(pc.dim('  A trusted config can run arbitrary commands (input.processors) and read local files.'));
  }
  writeErr(pc.dim('─'.repeat(72)));
  writeErr(shown);
  writeErr(pc.dim('─'.repeat(72)));
  writeErr();

  const trustOptions: { value: RemoteTrustChoice; label: string; hint?: string }[] = [
    { value: 'once', label: 'Yes, once' },
    {
      value: 'always',
      label: "Yes, and don't ask again for this repository",
      hint: 'remembered until temp files are cleared',
    },
    { value: 'no', label: 'No, do not run' },
  ];

  const clack = await deps.loadClack();
  const choice = await clack.select({
    message: "Trust and run this repository's config?",
    options: trustOptions,
    // Default to the safe choice so a stray Enter never grants trust.
    initialValue: 'no' satisfies RemoteTrustChoice,
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
