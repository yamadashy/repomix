import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadDirectoryTool } from '../../../src/mcp/tools/fileSystemReadDirectoryTool.js';
import { registerFileSystemReadFileTool } from '../../../src/mcp/tools/fileSystemReadFileTool.js';
import { registerGrepRepomixOutputTool } from '../../../src/mcp/tools/grepRepomixOutputTool.js';
import { registerOutputFile } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerPackCodebaseTool } from '../../../src/mcp/tools/packCodebaseTool.js';
import { registerReadRepomixOutputTool } from '../../../src/mcp/tools/readRepomixOutputTool.js';
import { logger, repomixLogLevels } from '../../../src/shared/logger.js';

// BLACKBOX CONTRACT for --sandbox. Drives the five tool handlers on a REAL temp
// workspace (no path/fs mocks) and asserts only observable request→response
// behavior. `runCli` is mocked ONLY to (a) prove the pattern/path guard rejects
// BEFORE the pack runs and (b) inject a failure for the error-leak assertions —
// the real pack pipeline needs the built lib and is exercised in the e2e suite.
//
// This suite must remain valid before AND after the internal boundary refactor.
// If an assertion here breaks without an observable behavior change, THIS test was
// coupled to implementation — fix the test, not the contract.
vi.mock('../../../src/cli/cliRun.js', () => ({ runCli: vi.fn() }));

import { runCli } from '../../../src/cli/cliRun.js';

// ── escape variants the guard MUST reject (host-aware) ────────────────────────
// Cross-platform: absolute-by-POSIX-and-Windows, "~" home refs, and any ".."
// segment on either separator.
const ESCAPING = [
  '/etc/passwd', // leading slash (absolute on every OS)
  '/', // bare root
  '..', // exact parent
  '../x',
  '../../etc/passwd',
  'a/../../b', // ".." segment in the middle
  'src/../../etc/passwd',
  'a/b/../../../c',
  '..\\x', // backslash ".." (Windows-style separator)
  'a\\..\\b',
  '~', // home ref
  '~/',
  '~/.ssh/id_rsa',
];
// Absolute only on Windows (drive / UNC / rooted-backslash). On POSIX these are
// harmless relative filenames, so only assert rejection on win32.
const WINDOWS_ONLY_ESCAPING = ['C:\\Windows\\System32', 'C:/Windows', '\\\\server\\share\\x', '\\x'];

// Look-alike names that are VALID filenames and must NOT be over-rejected: a leading
// "~" that is not a home ref, and dots that are not a ".." segment.
// (trailing-dot names like "foo.." / "..." are omitted: Windows strips trailing dots, so
// they can't be written to disk on a Windows runner — the escaping logic is orthogonal to them)
const ALLOWED_TRICKY = ['~weird.txt', '~$lock.docx', '..foo', 'a..b'];

// Pattern-specific smuggles the include/ignore guard MUST reject (brace expansion,
// comma lists, negation prefix — on top of the plain forms).
const ESCAPING_PATTERNS = [
  '/etc/passwd',
  '../x',
  '..',
  '~/x',
  '~',
  '{/etc/passwd,readme.md}', // brace hides an absolute alternative
  '{../secret,x}', // brace hides a ".."
  'src/**,/etc/passwd', // comma list, one absolute
  'src/**,../../*.env', // comma list, one ".."
  '!/etc/passwd', // negation prefix over an absolute
  '..\\secrets\\**',
];
const ALLOWED_PATTERNS = ['**/*.{js,ts}', 'src/**,docs/**', '!node_modules/**', 'a..b/**'];

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;
const capture = (register: (s: McpServer, c: { sandboxed: boolean; root: string }) => void, root: string): Handler => {
  const server = { registerTool: vi.fn().mockReturnThis() } as unknown as McpServer;
  register(server, { sandboxed: true, root });
  return (server.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];
};
const textOf = (r: CallToolResult): string => (r.content?.[0] as { text?: string })?.text ?? '';
const rejectedAsEscape = (r: CallToolResult): boolean => r.isError === true && /workspace root/i.test(textOf(r));

describe('sandbox contract', () => {
  let root = '';
  let readFile: Handler;
  let readDir: Handler;
  let pack: Handler;

  beforeEach(async () => {
    root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-contract-')));
    await fsp.mkdir(path.join(root, 'src'));
    await fsp.writeFile(path.join(root, 'src', 'a.ts'), 'const x = 1;\n');
    readFile = capture(registerFileSystemReadFileTool, root);
    readDir = capture(registerFileSystemReadDirectoryTool, root);
    pack = capture(registerPackCodebaseTool, root);
  });
  afterEach(async () => {
    vi.resetAllMocks();
    await fsp.rm(root, { recursive: true, force: true });
  });

  // No response — success or error — may echo the host workspace root. (Echoing the
  // agent's OWN input path, e.g. "/etc/passwd" in a rejection message, is safe: it's
  // the agent's literal string, not a host path. So we assert on `root`, not on any
  // absolute-looking token.)
  const assertNoHostPath = (r: CallToolResult): void => {
    expect(JSON.stringify(r)).not.toContain(root);
  };

  describe('confinement: file/dir path input rejects every escape variant', () => {
    test.each(ESCAPING)('read_file rejects %j', async (p) => {
      const r = await readFile({ path: p });
      expect(rejectedAsEscape(r), `read_file should reject ${p}`).toBe(true);
      assertNoHostPath(r);
    });
    test.each(ESCAPING)('read_directory rejects %j', async (p) => {
      const r = await readDir({ path: p });
      expect(rejectedAsEscape(r), `read_directory should reject ${p}`).toBe(true);
      assertNoHostPath(r);
    });
    test.each(WINDOWS_ONLY_ESCAPING)('read_file rejects %j on Windows (relative filename on POSIX)', async (p) => {
      const r = await readFile({ path: p });
      if (process.platform === 'win32') {
        expect(rejectedAsEscape(r)).toBe(true);
      } else {
        // Not an escape on POSIX: resolves to a (non-existent) in-root filename.
        expect(rejectedAsEscape(r)).toBe(false);
      }
      assertNoHostPath(r);
    });

    test('a rejection echoes the agent’s OWN input back (not blanked), so it sees what it sent', async () => {
      // The rejection message must show the exact path the agent supplied — that is
      // the agent's own string, not a host path, and blanking it (e.g. to "<path>")
      // would leave the agent unable to tell which argument was refused.
      const r = await readFile({ path: '/etc/passwd' });
      expect(rejectedAsEscape(r)).toBe(true);
      expect(textOf(r)).toContain('/etc/passwd');
      expect(textOf(r)).not.toContain('<path>');
    });
  });

  // A symlink is lexically clean (no "..", not absolute), so it passes the string
  // checks; only realpath reveals that it points outside root. These drive REAL
  // on-disk symlinks through the handlers to prove the real fs.realpath wiring
  // rejects them — the pathScope unit tests stub realpath and cannot cover this.
  describe('confinement: real symlink escapes are caught via realpath', () => {
    let outside = '';
    beforeEach(async () => {
      outside = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'sbx-outside-')));
      await fsp.writeFile(path.join(outside, 'secret.txt'), 'TOP SECRET');
    });
    afterEach(async () => {
      await fsp.rm(outside, { recursive: true, force: true });
    });

    test('read_file through an in-root symlink to an outside file is rejected and leaks nothing', async () => {
      if (process.platform === 'win32') return; // symlink creation needs privilege on Windows
      await fsp.symlink(path.join(outside, 'secret.txt'), path.join(root, 'link.txt'), 'file');
      const r = await readFile({ path: 'link.txt' });
      expect(rejectedAsEscape(r), 'a symlink escaping root must be rejected').toBe(true);
      expect(textOf(r)).not.toContain('TOP SECRET');
      expect(JSON.stringify(r)).not.toContain(outside); // the resolved external target must not leak either
      assertNoHostPath(r);
    });

    test('read_file through a symlinked directory used as a gateway is rejected', async () => {
      if (process.platform === 'win32') return;
      // realpath must resolve an INTERMEDIATE component, not just the leaf.
      await fsp.symlink(outside, path.join(root, 'gateway'), 'dir');
      const r = await readFile({ path: 'gateway/secret.txt' });
      expect(rejectedAsEscape(r)).toBe(true);
      expect(textOf(r)).not.toContain('TOP SECRET');
      expect(JSON.stringify(r)).not.toContain(outside);
      assertNoHostPath(r);
    });

    test('read_directory through an in-root symlink to an outside directory is rejected', async () => {
      if (process.platform === 'win32') return;
      await fsp.symlink(outside, path.join(root, 'linkdir'), 'dir');
      const r = await readDir({ path: 'linkdir' });
      expect(rejectedAsEscape(r), 'a symlinked directory escaping root must be rejected').toBe(true);
      expect(JSON.stringify(r)).not.toContain(outside);
      assertNoHostPath(r);
    });
  });

  describe('confinement: valid look-alike filenames are NOT over-rejected', () => {
    test.each(ALLOWED_TRICKY)('read_file reads %j (tilde/dots that are not escapes)', async (name) => {
      await fsp.writeFile(path.join(root, name), `body:${name}`);
      const r = await readFile({ path: name });
      expect(rejectedAsEscape(r), `${name} must not be rejected as an escape`).toBe(false);
      expect(r.isError ?? false).toBe(false);
      expect(r.structuredContent?.content).toBe(`body:${name}`);
      expect(r.structuredContent?.path).toBe(name); // echoed relative, not absolute
      assertNoHostPath(r);
    });
  });

  describe('confinement: pack directory + include/ignore patterns', () => {
    test.each(ESCAPING)('pack rejects escaping directory %j (guard runs before runCli)', async (p) => {
      const r = await pack({ directory: p, compress: false, topFilesLength: 10, style: 'xml' });
      expect(rejectedAsEscape(r), `pack should reject directory ${p}`).toBe(true);
      expect(runCli).not.toHaveBeenCalled();
      assertNoHostPath(r);
    });
    test.each(ESCAPING_PATTERNS)('pack rejects includePatterns %j', async (pattern) => {
      const r = await pack({
        directory: '.',
        includePatterns: pattern,
        compress: false,
        topFilesLength: 10,
        style: 'xml',
      });
      expect(rejectedAsEscape(r), `includePatterns ${pattern} should be rejected`).toBe(true);
      expect(runCli).not.toHaveBeenCalled();
      assertNoHostPath(r);
    });
    test.each(ESCAPING_PATTERNS)('pack rejects ignorePatterns %j', async (pattern) => {
      const r = await pack({
        directory: '.',
        ignorePatterns: pattern,
        compress: false,
        topFilesLength: 10,
        style: 'xml',
      });
      expect(rejectedAsEscape(r), `ignorePatterns ${pattern} should be rejected`).toBe(true);
      expect(runCli).not.toHaveBeenCalled();
      assertNoHostPath(r);
    });
    test.each(ALLOWED_PATTERNS)('pack ACCEPTS relative pattern %j (reaches runCli)', async (pattern) => {
      await pack({ directory: '.', includePatterns: pattern, compress: false, topFilesLength: 10, style: 'xml' });
      expect(runCli, `${pattern} should pass the guard`).toHaveBeenCalled();
    });
    test('a sandboxed pack locks down runCli: skips config, confines the search, disables git sort', async () => {
      // The lockdown is what keeps a sandboxed pack from reading the workspace's own
      // repomix.config / .git/config or matching outside root. gitSortByChanges:false
      // in particular stops `git -C <workspace> log` from spawning gpg.program.
      await pack({ directory: '.', compress: false, topFilesLength: 10, style: 'xml' });
      const cliOptions = vi.mocked(runCli).mock.calls[0]?.[2];
      expect(cliOptions).toMatchObject({
        skipLocalConfig: true,
        skipGlobalConfig: true,
        confineToBaseDir: true,
        gitSortByChanges: false,
      });
    });
    test('pack on a mistyped in-root directory → actionable "directory not found", not "operation failed"', async () => {
      // "scr" (typo for "src") resolves in-root but does not exist; the pre-check
      // must give the agent a specific reason (not the generic code-less fallback)
      // and short-circuit before ever invoking the pack pipeline.
      const r = await pack({ directory: 'scr', compress: false, topFilesLength: 10, style: 'xml' });
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain('directory not found');
      expect(textOf(r)).toContain('scr');
      expect(textOf(r)).not.toContain('operation failed');
      expect(runCli).not.toHaveBeenCalled();
      assertNoHostPath(r);
    });
    test('a pack restores the log level — it does not permanently silence the operator’s stderr', async () => {
      // runCli sets the shared logger to SILENT for quiet:true; a pack must not leave
      // it there, or every later tool's logger.error (the operator's only diagnostic
      // channel) is suppressed for the rest of the MCP session.
      logger.setLogLevel(repomixLogLevels.INFO);
      vi.mocked(runCli).mockImplementationOnce(async () => {
        logger.setLogLevel(repomixLogLevels.SILENT); // mimic quiet:true inside runCli
        return undefined as unknown as Awaited<ReturnType<typeof runCli>>;
      });
      await pack({ directory: '.', compress: false, topFilesLength: 10, style: 'xml' });
      expect(logger.getLogLevel()).toBe(repomixLogLevels.INFO);
    });
  });

  describe('no-leak: forced failures never surface a host path', () => {
    test('read_file on an unreadable in-root file leaks nothing', async () => {
      if (process.platform === 'win32') return; // chmod semantics differ on Windows
      const p = path.join(root, 'locked.txt');
      await fsp.writeFile(p, 'secret');
      await fsp.chmod(p, 0o000);
      const r = await readFile({ path: 'locked.txt' });
      // EACCES surfaces the absolute path in the raw error; the tool must not leak it.
      assertNoHostPath(r);
      await fsp.chmod(p, 0o600);
    });

    test('pack failure carrying an OUT-OF-workspace install path leaks nothing', async () => {
      // The real leak: pack workers / tree-sitter WASM load from the repomix install
      // dir, which in a real deployment lies OUTSIDE the workspace.
      const install = '/opt/fake-install/repomix/lib/core/x.js';
      const err = new Error(`ENOENT: no such file or directory, open '${install}'`);
      err.stack = `Error\n    at f (${install}:1:1)`;
      vi.mocked(runCli).mockRejectedValueOnce(err);
      const r = await pack({ directory: '.', compress: false, topFilesLength: 10, style: 'xml' });
      expect(r.isError).toBe(true);
      assertNoHostPath(r);
      expect(JSON.stringify(r)).not.toContain('/opt/fake-install');
    });

    test('pack failure with an out-of-workspace path CONTAINING SPACES leaks no fragment', async () => {
      // The gap that motivates the boundary refactor: string-level redaction cannot
      // cleanly cut a path with spaces (it stops at the first space), so a dir/user
      // name fragment survives. Not forwarding error.message at all closes it.
      const install = '/opt/fake install/repomix lib/core/x.js';
      const err = new Error(`ENOENT: no such file or directory, open '${install}'`);
      vi.mocked(runCli).mockRejectedValueOnce(err);
      const r = await pack({ directory: '.', compress: false, topFilesLength: 10, style: 'xml' });
      expect(r.isError).toBe(true);
      expect(JSON.stringify(r)).not.toContain('repomix lib'); // no surviving path fragment
      expect(JSON.stringify(r)).not.toContain('fake install');
    });

    test('read_output / grep_output on a stale outputId leak neither the temp path nor the host', async () => {
      const readOut = capture(registerReadRepomixOutputTool, root);
      const grepOut = capture(registerGrepRepomixOutputTool, root);
      registerOutputFile('deadbeefcontract', '/tmp/repomix/mcp-outputs/zzz/repomix-output.xml');
      for (const r of [
        await readOut({ outputId: 'deadbeefcontract' }),
        await grepOut({ outputId: 'deadbeefcontract', pattern: 'x' }),
      ]) {
        expect(r.isError).toBe(true);
        expect(textOf(r)).not.toContain('/tmp/repomix');
        expect(textOf(r)).toContain('deadbeefcontract'); // opaque id is safe to echo
      }
    });
  });

  describe('functionality: valid ops return correct relative results', () => {
    test('read_file returns content + a relative path', async () => {
      const r = await readFile({ path: 'src/a.ts' });
      expect(r.isError ?? false).toBe(false);
      expect(r.structuredContent?.path).toBe('src/a.ts');
      expect(r.structuredContent?.content).toBe('const x = 1;\n');
      assertNoHostPath(r);
    });
    test('read_directory "." lists entries with a relative path', async () => {
      const r = await readDir({ path: '.' });
      expect(r.isError ?? false).toBe(false);
      expect(r.structuredContent?.path).toBe('.');
      expect((r.structuredContent as { contents: string[] }).contents.some((c) => c.includes('src'))).toBe(true);
      assertNoHostPath(r);
    });
  });
});
