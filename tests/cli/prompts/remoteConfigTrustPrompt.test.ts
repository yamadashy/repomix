import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ConfirmRemoteConfigTrustDeps,
  confirmRemoteConfigTrust,
  isInteractive,
  isPromptRenderable,
} from '../../../src/cli/prompts/remoteConfigTrustPrompt.js';
import { OperationCancelledError, RepomixError } from '../../../src/shared/errorHandle.js';

const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

// The prompt reads the config without an encoding, so fs.readFile hands it a Buffer.
// Mocks must do the same or they would not exercise the raw-bytes digest.
const mockReadFile = (content: string | Buffer) => vi.fn().mockResolvedValue(Buffer.from(content as string));

describe('remoteConfigTrustPrompt', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Silence the trust prompt's stderr output so test logs stay clean, while still
    // allowing assertions on what the user was told.
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  const stderrOutput = () => stderrSpy.mock.calls.map((call: unknown[]) => String(call[0])).join('');

  // picocolors emits ANSI when colors are enabled (CI sets that), so assertions about
  // where a line starts must compare against uncolored text.
  /* oxlint-disable no-control-regex -- see the biome-ignore comment below */
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping real ANSI codes requires matching ESC
  const stripAnsi = (text: string): string => text.replace(/\u001b\[[0-9;]*m/g, '');
  /* oxlint-enable no-control-regex */

  describe('tty gating', () => {
    // isTTY is a plain data property (absent, not false, when the stream is not a
    // terminal), so it is assigned rather than spied on, and restored afterwards.
    type StreamName = 'stdin' | 'stderr' | 'stdout';
    const saved: Partial<Record<StreamName, boolean | undefined>> = {};
    const withTty = (over: Partial<Record<StreamName, boolean>>) => {
      for (const [name, value] of Object.entries(over) as [StreamName, boolean][]) {
        if (!(name in saved)) saved[name] = process[name].isTTY;
        process[name].isTTY = value;
      }
    };

    afterEach(() => {
      for (const [name, value] of Object.entries(saved) as [StreamName, boolean | undefined][]) {
        process[name].isTTY = value as boolean;
        delete saved[name];
      }
    });

    it('judges interactivity on stdin and stderr, never stdout', () => {
      // Gating on stdout would silently trust a --stdout run, which is exactly the
      // case the prompt exists for.
      withTty({ stdin: true, stderr: true, stdout: false });
      expect(isInteractive()).toBe(true);

      withTty({ stdin: false });
      expect(isInteractive()).toBe(false);
    });

    it('requires stdout to be a terminal before rendering the menu', () => {
      // clack draws on stdout: without a terminal there we would block on a keypress
      // for a menu nobody can see.
      withTty({ stdout: false });
      expect(isPromptRenderable()).toBe(false);

      withTty({ stdout: true });
      expect(isPromptRenderable()).toBe(true);
    });
  });

  describe('confirmRemoteConfigTrust', () => {
    const baseOptions = {
      repoDir: '/repo',
      repoUrl: 'github.com/user/repo',
      force: false,
      stdout: false,
      hasExplicitConfig: false,
    };

    const makeDeps = (over: Partial<ConfirmRemoteConfigTrustDeps> = {}): ConfirmRemoteConfigTrustDeps => ({
      findLocalConfigPath: vi.fn().mockResolvedValue('/repo/repomix.config.json'),
      readFile: mockReadFile('{"output":{"style":"xml"}}'),
      lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => false, isFile: () => true }),
      realpath: vi.fn(async (target: unknown) => String(target)) as unknown as ConfirmRemoteConfigTrustDeps['realpath'],
      isRemoteConfigTrusted: vi.fn().mockResolvedValue(false),
      markRemoteConfigTrusted: vi.fn().mockResolvedValue(undefined),
      isInteractive: vi.fn().mockReturnValue(true),
      isPromptRenderable: vi.fn().mockReturnValue(true),
      loadClack: vi.fn().mockResolvedValue({
        select: vi.fn().mockResolvedValue('once'),
        isCancel: vi.fn().mockReturnValue(false),
        cancel: vi.fn(),
      }),
      ...over,
    });

    it('skips when an absolute --config is in use (hasExplicitConfig)', async () => {
      const deps = makeDeps();
      await confirmRemoteConfigTrust({ ...baseOptions, hasExplicitConfig: true }, deps);
      expect(deps.findLocalConfigPath).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('skips when the cloned repo has no config file', async () => {
      const deps = makeDeps({ findLocalConfigPath: vi.fn().mockResolvedValue(null) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('rejects a config that is not a regular file', async () => {
      // A directory or FIFO named repomix.config.json is not a symlink, but reading it
      // would not give the reviewed bytes either.
      const deps = makeDeps({
        lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => false, isFile: () => false }),
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
      expect(deps.readFile).not.toHaveBeenCalled();
    });

    it('warns that a JSON config can still run commands and read files', async () => {
      const deps = makeDeps();
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      expect(output).toContain('input.processors');
      // Only a .ts/.js config is labelled executable; a JSON one must not be.
      expect(output).not.toContain('executable code');
    });

    it('rejects a symlinked config even under --force', async () => {
      // --force and CI accept running the repo's config, not a file outside the
      // clone. Config loading follows symlinks and checks nothing, so if this guard
      // only ran on the interactive path it would protect only watched runs.
      const deps = makeDeps({ lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => true, isFile: () => false }) });
      await expect(confirmRemoteConfigTrust({ ...baseOptions, force: true }, deps)).rejects.toThrow(RepomixError);
      expect(deps.readFile).not.toHaveBeenCalled();
    });

    it('rejects a config resolving outside the clone in a non-interactive shell', async () => {
      const deps = makeDeps({
        isInteractive: vi.fn().mockReturnValue(false),
        realpath: vi.fn(async (target: unknown) =>
          String(target).endsWith('.json') ? '/elsewhere/repomix.config.json' : String(target),
        ) as unknown as ConfirmRemoteConfigTrustDeps['realpath'],
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
    });

    it('skips the prompt when --force is passed, but says so', async () => {
      const deps = makeDeps();
      await confirmRemoteConfigTrust({ ...baseOptions, force: true }, deps);
      expect(deps.isInteractive).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
      // --force is a broad flag, so the suppressed review must not be silent.
      expect(stderrOutput()).toContain('--force');
    });

    it('labels a .ts config as executable code', async () => {
      const deps = makeDeps({ findLocalConfigPath: vi.fn().mockResolvedValue('/repo/repomix.config.ts') });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(stderrOutput()).toContain('executable code');
    });

    it('truncates an oversized config on a byte budget', async () => {
      // 10k multi-byte characters: slicing by UTF-16 units would blow past the byte cap.
      const huge = 'あ'.repeat(10_000);
      const deps = makeDeps({ readFile: mockReadFile(huge) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      expect(output).toContain('config truncated for display');
      // The echoed config itself must respect the 8 KB cap. Measured on the prefixed
      // lines only, so the surrounding banner and notice do not mask an overrun.
      const configBytes = output
        .split('\n')
        .filter((line: string) => line.startsWith('| '))
        .join('\n');
      expect(Buffer.byteLength(configBytes, 'utf8')).toBeLessThanOrEqual(8 * 1024 + 200 * 2);
    });

    it('trusts without prompting in a non-interactive shell', async () => {
      const deps = makeDeps({ isInteractive: vi.fn().mockReturnValue(false) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.readFile).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('skips the prompt when the exact config is already trusted', async () => {
      const deps = makeDeps({ isRemoteConfigTrusted: vi.fn().mockResolvedValue(true) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('escapes ANSI escape sequences instead of letting them reach the terminal', async () => {
      // A config that tries to clear the screen and scroll the warning away.
      const hostile = '{"a":1}\u001b[2J\u001b[H\u001b[1Ainnocent looking';
      const deps = makeDeps({ readFile: mockReadFile(hostile) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      // The raw ESC must never be emitted; it is shown in an escaped, visible form.
      expect(output).not.toContain('\u001b[2J');
      expect(output).toContain('\\x1b[2J');
    });

    it('digests the raw config, not the sanitized display form', async () => {
      const hostile = 'a\u001b[2Jb';
      const deps = makeDeps({
        readFile: mockReadFile(hostile),
        loadClack: vi.fn().mockResolvedValue({
          select: vi.fn().mockResolvedValue('always'),
          isCancel: vi.fn().mockReturnValue(false),
          cancel: vi.fn(),
        }),
      });
      await confirmRemoteConfigTrust(baseOptions, deps);
      // The pin must match the bytes that will actually be loaded.
      expect(deps.markRemoteConfigTrusted).toHaveBeenCalledWith(baseOptions.repoUrl, sha256(Buffer.from(hostile)));
    });

    it('digests raw bytes, so files that decode alike still pin apart', async () => {
      // Both byte strings decode to the same U+FFFD text, so hashing the decoded
      // string would let a repo swap one for the other without re-prompting.
      const digestFor = async (bytes: Buffer) => {
        const deps = makeDeps({
          readFile: vi.fn().mockResolvedValue(bytes),
          loadClack: vi.fn().mockResolvedValue({
            select: vi.fn().mockResolvedValue('always'),
            isCancel: vi.fn().mockReturnValue(false),
            cancel: vi.fn(),
          }),
        });
        await confirmRemoteConfigTrust(baseOptions, deps);
        return (deps.markRemoteConfigTrusted as ReturnType<typeof vi.fn>).mock.calls[0][1];
      };

      const a = Buffer.from([0x7b, 0xff, 0x7d]);
      const b = Buffer.from([0x7b, 0xfe, 0x7d]);
      expect(a.toString('utf8')).toBe(b.toString('utf8'));
      expect(await digestFor(a)).not.toBe(await digestFor(b));
    });

    it('escapes the line separators U+2028 and U+2029', async () => {
      // Renderers that treat these as line breaks would show a line that carries no
      // CONFIG_LINE_PREFIX, which is how the config is told apart from our own output.
      const deps = makeDeps({ readFile: mockReadFile('{"a":1}\u2028{"b":2}\u2029') });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      expect(output).not.toContain('\u2028');
      expect(output).not.toContain('\u2029');
      expect(output).toContain('\\u2028');
      expect(output).toContain('\\u2029');
    });

    it('warns that the truncated remainder is trusted as well', async () => {
      const deps = makeDeps({ readFile: mockReadFile('x'.repeat(20_000)) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      // The decision covers the whole file, not just the part that fits on screen.
      expect(stderrOutput()).toContain('the hidden part is trusted too');
    });

    it('escapes bidi and invisible formatting characters (Trojan Source)', async () => {
      // U+202E flips display order; U+200B is invisible. Both would make the shown
      // config read differently from what actually executes.
      const hostile = '{"a":"\u202eevil\u200b"}';
      const deps = makeDeps({ readFile: mockReadFile(hostile) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      expect(output).not.toContain('\u202e');
      expect(output).not.toContain('\u200b');
      expect(output).toContain('\\u202e');
      expect(output).toContain('\\u200b');
    });

    it('caps the number of displayed lines so the warning cannot be scrolled away', async () => {
      // Thousands of newlines stay under the byte cap but would push the banner off screen.
      const deps = makeDeps({ readFile: mockReadFile('\n'.repeat(5000)) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      expect(output).toContain('config truncated for display');
      // Exactly the cap: one prefixed line per displayed config line.
      expect(output.split('\n').filter((line: string) => line.startsWith('| ')).length).toBe(200);
    });

    it('escapes astral-plane tag characters as whole code points', async () => {
      // U+E0041 is invisible but is part of the file; charCodeAt would only see a
      // surrogate half here, so this pins the Unicode-aware handling.
      const deps = makeDeps({ readFile: mockReadFile('{"a":"x\u{E0041}"}') });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const output = stderrOutput();
      expect(output).not.toContain('\u{E0041}');
      expect(output).toContain('\\u{e0041}');
    });

    it('emits the truncation notice outside the fenced config so it cannot be forged', async () => {
      // The config forges both a closing separator and the notice text.
      const forged = [
        'x'.repeat(20),
        '\u2500'.repeat(72),
        '(config truncated for display; forged)',
        'y'.repeat(20_000),
      ].join('\n');
      const deps = makeDeps({ readFile: mockReadFile(forged) });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const lines: string[] = stripAnsi(stderrOutput()).split('\n');

      // Everything the config supplied is prefixed, including its forged notice.
      expect(lines.some((line) => line.startsWith('| (config truncated for display; forged)'))).toBe(true);
      // The genuine notice is the only unprefixed one, so it cannot be imitated.
      const genuine = lines.filter((line) => line.startsWith('(config truncated for display'));
      expect(genuine).toHaveLength(1);
      expect(genuine[0]).not.toContain('forged');
    });

    it('refuses to prompt when stdout is not a terminal', async () => {
      // stdin/stderr look interactive but the clack menu would render into a
      // redirected stdout, leaving the user staring at an invisible prompt.
      const deps = makeDeps({ isPromptRenderable: vi.fn().mockReturnValue(false) });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(/stdout is not a terminal/);
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('restates the risk and the source in the prompt message', async () => {
      const select = vi.fn().mockResolvedValue('once');
      const deps = makeDeps({
        loadClack: vi.fn().mockResolvedValue({ select, isCancel: vi.fn().mockReturnValue(false), cancel: vi.fn() }),
      });
      await confirmRemoteConfigTrust(baseOptions, deps);
      const { message } = select.mock.calls[0][0];
      expect(message).toContain(baseOptions.repoUrl);
      expect(message).toContain('arbitrary commands');
    });

    it('refuses a config that is a symlink', async () => {
      const deps = makeDeps({
        lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => true, isFile: () => false }),
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
      // The symlink target must never be read or shown.
      expect(deps.readFile).not.toHaveBeenCalled();
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('refuses a config whose real path escapes the cloned repo', async () => {
      const deps = makeDeps({
        realpath: vi.fn(async (target: unknown) =>
          String(target) === '/repo' ? '/repo' : '/etc/shadow',
        ) as unknown as ConfirmRemoteConfigTrustDeps['realpath'],
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
      expect(deps.readFile).not.toHaveBeenCalled();
    });

    it('reports a readable error when the config cannot be read', async () => {
      const deps = makeDeps({ readFile: vi.fn().mockRejectedValue(new Error('EACCES: permission denied')) });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(RepomixError);
    });

    it('refuses to prompt under --stdout rather than corrupt piped output', async () => {
      const deps = makeDeps();
      await expect(confirmRemoteConfigTrust({ ...baseOptions, stdout: true }, deps)).rejects.toThrow(
        /packed output is being written to stdout/,
      );
      expect(deps.loadClack).not.toHaveBeenCalled();
    });

    it('aborts when the user selects "No"', async () => {
      const deps = makeDeps({
        loadClack: vi.fn().mockResolvedValue({
          select: vi.fn().mockResolvedValue('no'),
          isCancel: vi.fn().mockReturnValue(false),
          cancel: vi.fn(),
        }),
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(OperationCancelledError);
      expect(deps.markRemoteConfigTrusted).not.toHaveBeenCalled();
    });

    it('aborts when the prompt is cancelled', async () => {
      const deps = makeDeps({
        loadClack: vi.fn().mockResolvedValue({
          select: vi.fn().mockResolvedValue(Symbol('cancel')),
          isCancel: vi.fn().mockReturnValue(true),
          cancel: vi.fn(),
        }),
      });
      await expect(confirmRemoteConfigTrust(baseOptions, deps)).rejects.toThrow(OperationCancelledError);
    });

    it('proceeds without remembering when the user selects "Yes, once"', async () => {
      const deps = makeDeps(); // select defaults to 'once'
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.markRemoteConfigTrusted).not.toHaveBeenCalled();
    });

    it('remembers the config digest when the user selects "Yes, always"', async () => {
      const configBytes = '{"output":{"style":"markdown"}}';
      const deps = makeDeps({
        readFile: mockReadFile(configBytes),
        loadClack: vi.fn().mockResolvedValue({
          select: vi.fn().mockResolvedValue('always'),
          isCancel: vi.fn().mockReturnValue(false),
          cancel: vi.fn(),
        }),
      });
      await confirmRemoteConfigTrust(baseOptions, deps);
      expect(deps.markRemoteConfigTrusted).toHaveBeenCalledWith(baseOptions.repoUrl, sha256(configBytes));
    });
  });
});
