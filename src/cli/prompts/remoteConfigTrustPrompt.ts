import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import { findLocalConfigPath, isExecutableConfigPath } from '../../config/configLoad.js';
import { OperationCancelledError, RepomixError } from '../../shared/errorHandle.js';
import { writeStderrLine as writeErr } from '../../shared/stderrWrite.js';
import { isRemoteConfigTrusted, markRemoteConfigTrusted, sha256 } from './remoteConfigTrustStore.js';

// Cap how much of the config we echo so a huge file cannot bury the interesting
// part or flood the terminal. The user is told when it is truncated.
const MAX_DISPLAY_BYTES = 8 * 1024;

// Cap the number of lines too. A config padded with newlines would otherwise push
// the warning above it out of the scrollback while staying under the byte cap.
const MAX_DISPLAY_LINES = 200;

// Every echoed config line carries this prefix, so lines without it are ours. Without
// it the config could print its own separator and truncation notice and convince the
// reader that the dangerous part below was not config at all.
const CONFIG_LINE_PREFIX = '| ';

// Characters that must never reach the terminal verbatim:
// - C0/C1 controls (minus tab and newline, which carry the config's real layout),
//   because ANSI/VT sequences can repaint or scroll the screen.
// - Bidi controls, because they let displayed text read differently from what
//   actually executes (Trojan Source, CVE-2021-42574).
// - Other invisible formatting: deprecated format characters, the combining
//   grapheme joiner, variation selectors, and the tag block, which hide content
//   from the reader while remaining part of the file.
// - U+2028/U+2029, which some renderers treat as line terminators: a config
//   could otherwise produce what looks like a fresh line without the prefix.
// Unicode-aware so the astral ranges match whole code points rather than halves of
// a surrogate pair.
/* oxlint-disable no-control-regex, no-misleading-character-class -- see the biome-ignore comments below */
const CONTROL_CHARS_RE =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point of this sanitizer
  // biome-ignore lint/suspicious/noMisleadingCharacterClass: each code point is escaped individually, never matched as a grapheme cluster
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u034F\u061C\u180B-\u180D\u180F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF\u{1D173}-\u{1D17A}\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu;
/* oxlint-enable no-control-regex, no-misleading-character-class */

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
  text.replace(CONTROL_CHARS_RE, (char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0xff) return `\\x${code.toString(16).padStart(2, '0')}`;
    if (code <= 0xffff) return `\\u${code.toString(16).padStart(4, '0')}`;
    return `\\u{${code.toString(16)}}`;
  });

// Interactivity is judged on stdin+stderr, never stdout: `--stdout` pipes the
// packed output through stdout, so gating on stdout.isTTY would silently trust a
// piped run — exactly the case we want to prompt in.
export const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stderr.isTTY);

// @clack/prompts renders the menu on stdout. If stdout is not a terminal the menu
// is invisible (redirected to a file or piped) even though stdin/stderr still look
// interactive, so we would silently block on a keypress for a prompt nobody can see.
export const isPromptRenderable = (): boolean => Boolean(process.stdout.isTTY);

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
  isPromptRenderable: typeof isPromptRenderable;
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
    isPromptRenderable,
    loadClack,
  },
): Promise<void> => {
  const { repoDir, repoUrl, force, stdout, hasExplicitConfig } = options;

  // An absolute --config was supplied: the cloned repo's own config is never
  // loaded (enforced in remoteAction), so there is nothing to confirm.
  if (hasExplicitConfig) return;

  const configPath = await deps.findLocalConfigPath(repoDir);
  if (!configPath) return; // no config in the cloned repo → nothing is trusted

  // Not sanitized where it is printed: it always comes from the loader's fixed
  // filename allowlist, unlike repoUrl and the config body.
  const configName = path.basename(configPath);

  // Runs before the skip paths below. Config loading follows symlinks and does no
  // containment check of its own, so leaving this to the interactive branch would
  // mean the escape is only blocked while someone is watching. --force and CI are
  // consent to run the repo's config, not consent to run a file outside the clone.
  await assertConfigIsContained(configPath, repoDir, deps);

  // --force skips all confirmation prompts (explicit intent, responsibility on the
  // caller). It is a broad flag, so say what it suppressed rather than silently
  // granting a remote config the right to run.
  if (force) {
    writeErr(pc.dim(`Trusting remote config without review (--force): ${configName} (${sanitizeForDisplay(repoUrl)})`));
    return;
  }

  // Non-interactive (CI, pipes): keep the historical non-prompting behavior so
  // existing --remote-trust-config automations do not hang. Announce it on stderr.
  if (!deps.isInteractive()) {
    writeErr(pc.dim(`Trusting remote config non-interactively: ${configName} (${sanitizeForDisplay(repoUrl)})`));
    return;
  }

  let configBytes: Buffer;
  try {
    configBytes = await deps.readFile(configPath);
  } catch (error) {
    throw new RepomixError(
      `Could not read the remote repository's config (${configName}) for review: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  // Pin the raw bytes, not the decoded text. Decoding as UTF-8 maps every invalid
  // sequence to U+FFFD, so two different files can decode to the same string; a repo
  // could then swap in a config the user never approved and still match the stored
  // digest. Code configs are loaded from bytes by jiti, so the bytes are what runs.
  const configDigest = sha256(configBytes);
  const configText = configBytes.toString('utf8');

  // Already trusted for this exact config content.
  if (await deps.isRemoteConfigTrusted(repoUrl, configDigest)) return;

  // The menu renders on stdout. Under --stdout the packed output goes there too and
  // the two collide; if stdout is redirected or piped the menu is invisible and we
  // would block on a keypress nobody can see. Refuse in both cases rather than
  // silently trusting, corrupting the output, or hanging.
  if (stdout || !deps.isPromptRenderable()) {
    const reason = stdout
      ? 'the packed output is being written to stdout, which would collide with it'
      : 'stdout is not a terminal, so the prompt would be invisible';
    throw new RepomixError(
      `Reviewing the remote repository's config (${configName}) needs an interactive prompt, but ${reason}.\n` +
        '  Re-run without --stdout or output redirection to review it, or pass --force to skip the prompt (you accept running the remote config).',
    );
  }

  // Ask the loader, not a second copy of the extension list: this decides whether
  // the user is warned that the config executes, so it must not drift from what
  // actually gets handed to jiti.
  const isCode = isExecutableConfigPath(configName);
  // Bound the work before escaping. The config is attacker-controlled, so a padded
  // multi-MB file would otherwise force a full-file regex pass and a full-size copy
  // to print at most 8 KB. Cutting the raw text to MAX_DISPLAY_BYTES UTF-16 units is
  // a safe superset of what can ever be shown: escaping maps each character to at
  // least itself, so the printed bytes can only come from an equally short prefix.
  // Past that length the output is certainly truncated, whatever the caps decide.
  const overWindow = configText.length > MAX_DISPLAY_BYTES;
  const windowText = overWindow ? configText.slice(0, MAX_DISPLAY_BYTES) : configText;

  // Escape control characters first so the caps apply to what is actually printed,
  // then cap on both lines and bytes. The line cap matters on its own: a config
  // padded with thousands of newlines would otherwise scroll the warning above it
  // off the screen, leaving only the innocuous-looking question on display.
  // Byte slicing is done on a Buffer because slicing the string would cut by UTF-16
  // code units and blow past the cap on multi-byte content.
  const displayText = sanitizeForDisplay(windowText);
  const lines = displayText.split('\n');
  const lineTruncated = lines.length > MAX_DISPLAY_LINES;
  const lineCapped = lineTruncated ? lines.slice(0, MAX_DISPLAY_LINES).join('\n') : displayText;
  const byteTruncated = Buffer.byteLength(lineCapped, 'utf8') > MAX_DISPLAY_BYTES;
  const capped = byteTruncated
    ? Buffer.from(lineCapped, 'utf8').subarray(0, MAX_DISPLAY_BYTES).toString('utf8')
    : lineCapped;
  const shown = capped
    .split('\n')
    .map((line) => `${CONFIG_LINE_PREFIX}${line}`)
    .join('\n');
  const wasTruncated = overWindow || lineTruncated || byteTruncated;

  writeErr();
  writeErr(
    pc.yellow(pc.bold(`⚠ ${sanitizeForDisplay(repoUrl)} ships a config file that will be trusted: ${configName}`)),
  );
  if (isCode) {
    writeErr(pc.yellow('  This is executable code — loading it runs arbitrary commands on your machine.'));
  } else {
    writeErr(pc.dim('  A trusted config can run arbitrary commands (input.processors) and read local files.'));
  }
  writeErr(pc.dim('─'.repeat(72)));
  writeErr(shown);
  writeErr(pc.dim('─'.repeat(72)));
  // Unprefixed on purpose: a config can print its own separator and notice, but it
  // cannot emit a line without CONFIG_LINE_PREFIX, so only this one is ours.
  if (wasTruncated) {
    // Say that the hidden part is trusted too. A config can front-load harmless
    // settings and bury `input.processors` past the cap, so a notice that only
    // mentions the display would understate what the answer below covers.
    writeErr(
      pc.dim(`(config truncated for display; ${configName} is longer than shown, and the hidden part is trusted too)`),
    );
  }
  writeErr();

  const trustOptions: { value: RemoteTrustChoice; label: string; hint?: string }[] = [
    { value: 'once', label: 'Yes, once' },
    {
      value: 'always',
      label: "Yes, and don't ask again for this repository",
      hint: 'until this repo changes its config, or your OS clears its temp dir',
    },
    { value: 'no', label: 'No, do not run' },
  ];

  const clack = await deps.loadClack();
  const choice = await clack.select({
    // Restate the risk and the source here: this line renders last and stays on
    // screen with the options, so it survives a config that scrolled the banner away.
    message: `Trust and run this config from ${sanitizeForDisplay(repoUrl)}? It can run arbitrary commands on your machine.`,
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
