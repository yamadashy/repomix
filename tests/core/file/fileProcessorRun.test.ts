import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyFileProcessors,
  logFileProcessorStatus,
  runProcessorCommand,
} from '../../../src/core/file/fileProcessorRun.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import { logger } from '../../../src/shared/logger.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('fileProcessorRun', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'note').mockImplementation(() => {});
    vi.spyOn(logger, 'log').mockImplementation(() => {});
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const rawFiles: RawFile[] = [
    { path: 'a.json', content: '{"a":1}' },
    { path: 'b.ts', content: 'const b = 1;' },
  ];

  describe('applyFileProcessors gating', () => {
    it('returns files unchanged when the gate is off, even with processors configured', async () => {
      const config = createMockConfig({
        enableFileProcessors: false,
        input: { processors: [{ pattern: '**/*.json', command: 'cat {file}' }] },
      });
      const runProcessorCommandMock = vi.fn();

      const result = await applyFileProcessors(rawFiles, '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(result).toBe(rawFiles);
      expect(runProcessorCommandMock).not.toHaveBeenCalled();
    });

    it('returns files unchanged when the gate key is absent (library/MCP default)', async () => {
      // createMockConfig omits enableFileProcessors entirely — the real default for
      // library pack()/runCli() callers and MCP, which never inject the gate.
      const config = createMockConfig({
        input: { processors: [{ pattern: '**/*.json', command: 'cat {file}' }] },
      });
      expect(config.enableFileProcessors).toBeUndefined();
      const runProcessorCommandMock = vi.fn();

      const result = await applyFileProcessors(rawFiles, '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(result).toBe(rawFiles);
      expect(runProcessorCommandMock).not.toHaveBeenCalled();
    });

    it('returns files unchanged when enabled but no processors configured', async () => {
      const config = createMockConfig({ enableFileProcessors: true });
      const runProcessorCommandMock = vi.fn();

      const result = await applyFileProcessors(rawFiles, '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(result).toBe(rawFiles);
      expect(runProcessorCommandMock).not.toHaveBeenCalled();
    });

    it('returns files unchanged when enabled but no file matches', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.md', command: 'cat {file}' }] },
      });
      const runProcessorCommandMock = vi.fn();

      const result = await applyFileProcessors(rawFiles, '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(result).toBe(rawFiles);
      expect(runProcessorCommandMock).not.toHaveBeenCalled();
    });
  });

  describe('applyFileProcessors transforms', () => {
    it('replaces matching file content with command stdout', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });
      const runProcessorCommandMock = vi.fn().mockResolvedValue('a: 1');

      const result = await applyFileProcessors(rawFiles, '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(result).toEqual([
        { path: 'a.json', content: 'a: 1' },
        { path: 'b.ts', content: 'const b = 1;' },
      ]);
      // Only the matching file spawns a command
      expect(runProcessorCommandMock).toHaveBeenCalledTimes(1);
      expect(runProcessorCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'toon {file}', content: '{"a":1}', cwd: '/root' }),
      );
    });

    it('applies the first matching processor only (first match wins)', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: {
          processors: [
            { pattern: '**/*.json', command: 'first {file}' },
            { pattern: 'a.json', command: 'second {file}' },
          ],
        },
      });
      const runProcessorCommandMock = vi.fn().mockResolvedValue('transformed');

      await applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(runProcessorCommandMock).toHaveBeenCalledWith(expect.objectContaining({ command: 'first {file}' }));
      // Exactly one processor runs per file — no chaining.
      expect(runProcessorCommandMock).toHaveBeenCalledTimes(1);
    });

    it('passes a unique temp file path preserving the extension', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });
      const runProcessorCommandMock = vi.fn().mockResolvedValue('out');

      await applyFileProcessors(
        [
          { path: 'dir1/index.json', content: '{}' },
          { path: 'dir2/index.json', content: '{}' },
        ],
        '/root',
        config,
        () => {},
        { runProcessorCommand: runProcessorCommandMock },
      );

      const tempPaths = runProcessorCommandMock.mock.calls.map((call) => call[0].tempFilePath as string);
      expect(tempPaths).toHaveLength(2);
      expect(tempPaths[0]).not.toBe(tempPaths[1]);
      expect(tempPaths.every((p) => p.endsWith('.json'))).toBe(true);
    });

    it('drops an unsafe extension from the temp path to avoid shell variable expansion', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*', command: 'toon {file}' }] },
      });
      const runProcessorCommandMock = vi.fn().mockResolvedValue('out');

      await applyFileProcessors([{ path: 'payload.%PATH%', content: 'x' }], '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      const tempFilePath = runProcessorCommandMock.mock.calls[0][0].tempFilePath as string;
      expect(tempFilePath).not.toContain('%');
    });

    it('uses the configured timeout for a processor', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}', timeout: 1234 }] },
      });
      const runProcessorCommandMock = vi.fn().mockResolvedValue('out');

      await applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(runProcessorCommandMock).toHaveBeenCalledWith(expect.objectContaining({ timeout: 1234 }));
    });
  });

  describe('applyFileProcessors error handling', () => {
    it('throws a RepomixError when a processor fails with the default (fail) mode', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });
      const runProcessorCommandMock = vi.fn().mockRejectedValue(new Error('boom'));

      await expect(
        applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
          runProcessorCommand: runProcessorCommandMock,
        }),
      ).rejects.toThrow(/File processor failed for "a\.json"/);
    });

    it('falls back to original content and warns when onError is "skip"', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}', onError: 'skip' }] },
      });
      const runProcessorCommandMock = vi.fn().mockRejectedValue(new Error('boom'));

      const result = await applyFileProcessors([{ path: 'a.json', content: '{"a":1}' }], '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(result).toEqual([{ path: 'a.json', content: '{"a":1}' }]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('using original content'));
    });

    it('throws when a processor command is missing the {file} placeholder', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon' }] },
      });
      const runProcessorCommandMock = vi.fn();

      await expect(
        applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
          runProcessorCommand: runProcessorCommandMock,
        }),
      ).rejects.toThrow(/must contain the \{file\} placeholder/);
      expect(runProcessorCommandMock).not.toHaveBeenCalled();
    });

    it('waits for all in-flight commands to settle before failing (fail mode)', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });

      // File "a" fails immediately; file "b" resolves only after we release it.
      // The fail must not surface until b's command has settled, so the temp dir
      // is never torn down while a command is still running.
      let releaseB: (value: string) => void = () => {};
      const bSettled = { done: false };
      const runProcessorCommandMock = vi.fn((params: { content: string }) => {
        if (params.content === 'A') {
          return Promise.reject(new Error('boom'));
        }
        return new Promise<string>((resolve) => {
          releaseB = (value) => {
            bSettled.done = true;
            resolve(value);
          };
        });
      });

      const resultPromise = applyFileProcessors(
        [
          { path: 'a.json', content: 'A' },
          { path: 'b.json', content: 'B' },
        ],
        '/root',
        config,
        () => {},
        { runProcessorCommand: runProcessorCommandMock },
      );
      // Track whether the overall promise rejects before we release "b". A regression
      // to fail-fast (Promise.all + immediate cleanup) would settle it here — the whole
      // point this test guards against.
      let rejectedEarly = false;
      resultPromise.catch(() => {
        rejectedEarly = true;
      });

      // Let the microtask/timer queue flush so "a" has rejected; the overall promise
      // must still be pending because "b" has not settled yet.
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(rejectedEarly).toBe(false);
      expect(bSettled.done).toBe(false);

      releaseB('transformed-b');
      await expect(resultPromise).rejects.toThrow(/File processor failed for "a\.json"/);
      expect(bSettled.done).toBe(true);
      expect(runProcessorCommandMock).toHaveBeenCalledTimes(2);
    });

    it('caps the number of concurrent processor commands', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });

      let active = 0;
      let peak = 0;
      const runProcessorCommandMock = vi.fn(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return 'out';
      });

      const files = Array.from({ length: 40 }, (_, i) => ({ path: `f${i}.json`, content: '{}' }));
      await applyFileProcessors(files, '/root', config, () => {}, { runProcessorCommand: runProcessorCommandMock });

      // The module-level semaphore caps concurrency at min(8, cpus); it must run
      // several in parallel (not serialize) but never exceed the hard ceiling of 8.
      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(8);
      expect(runProcessorCommandMock).toHaveBeenCalledTimes(40);
    });

    it('shares the concurrency cap across concurrent per-root calls', async () => {
      // The module-level semaphore must bound the combined concurrency of two
      // applyFileProcessors calls (the multi-root case), not 8-per-call.
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });

      let active = 0;
      let peak = 0;
      const runProcessorCommandMock = vi.fn(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return 'out';
      });

      const makeFiles = (prefix: string) =>
        Array.from({ length: 20 }, (_, i) => ({ path: `${prefix}/f${i}.json`, content: '{}' }));

      await Promise.all([
        applyFileProcessors(makeFiles('a'), '/root-a', config, () => {}, {
          runProcessorCommand: runProcessorCommandMock,
        }),
        applyFileProcessors(makeFiles('b'), '/root-b', config, () => {}, {
          runProcessorCommand: runProcessorCommandMock,
        }),
      ]);

      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(8);
      expect(runProcessorCommandMock).toHaveBeenCalledTimes(40);
    });

    it('accepts empty stdout as valid content but warns when it blanks a non-empty file', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });
      const runProcessorCommandMock = vi.fn().mockResolvedValue('');

      const result = await applyFileProcessors([{ path: 'a.json', content: '{"a":1}' }], '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      expect(result).toEqual([{ path: 'a.json', content: '' }]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('produced empty output'));
    });

    it('includes the command stderr in the failure message', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });
      const runProcessorCommandMock = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('Command failed'), { stderr: 'boom detail from tool' }));

      await expect(
        applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
          runProcessorCommand: runProcessorCommandMock,
        }),
      ).rejects.toThrow(/boom detail from tool/);
    });

    it('reports a timeout distinctly in the failure message', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}', timeout: 1234 }] },
      });
      // execFile marks a timed-out process as killed.
      const runProcessorCommandMock = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('Command failed'), { killed: true }));

      await expect(
        applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
          runProcessorCommand: runProcessorCommandMock,
        }),
      ).rejects.toThrow(/timed out after 1234ms/);
    });

    it('reports a stdout-overflow distinctly in the failure message', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });
      const runProcessorCommandMock = vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('Command failed'), { killed: true, code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' }),
        );

      await expect(
        applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
          runProcessorCommand: runProcessorCommandMock,
        }),
      ).rejects.toThrow(/output exceeded the .* limit/);
    });

    it('removes the temp directory after processing', async () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });
      let capturedTempPath = '';
      const runProcessorCommandMock = vi.fn((params: { tempFilePath: string }) => {
        capturedTempPath = params.tempFilePath;
        return Promise.resolve('out');
      });

      await applyFileProcessors([{ path: 'a.json', content: '{}' }], '/root', config, () => {}, {
        runProcessorCommand: runProcessorCommandMock,
      });

      // The per-invocation temp dir must be gone once processing completes.
      await expect(fs.access(path.dirname(capturedTempPath))).rejects.toThrow();
    });
  });

  describe('runProcessorCommand', () => {
    it('writes content to the temp file, substitutes {file}, and returns stdout', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc-test-'));
      const tempFilePath = path.join(tempDir, '0-a.json');
      const execFileAsyncMock = vi.fn().mockResolvedValue({ stdout: 'transformed output', stderr: '' });
      const deps = { execFileAsync: execFileAsyncMock } as unknown as Parameters<typeof runProcessorCommand>[1];

      try {
        const result = await runProcessorCommand(
          {
            command: 'toon {file}',
            content: '{"a":1}',
            tempFilePath,
            timeout: 5000,
            cwd: tempDir,
          },
          deps,
        );

        expect(result).toBe('transformed output');
        // The file content was actually written to the temp path
        await expect(fs.readFile(tempFilePath, 'utf8')).resolves.toBe('{"a":1}');

        // The command string passed to the shell must contain the substituted (quoted)
        // temp path, not the literal placeholder.
        const shellArgs = execFileAsyncMock.mock.calls[0][1] as string[];
        const commandArg = shellArgs[shellArgs.length - 1];
        expect(commandArg).not.toContain('{file}');
        expect(commandArg).toContain('0-a.json');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('substitutes every {file} occurrence', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc-test-'));
      const tempFilePath = path.join(tempDir, '0-a.json');
      const execFileAsyncMock = vi.fn().mockResolvedValue({ stdout: 'out', stderr: '' });
      const deps = { execFileAsync: execFileAsyncMock } as unknown as Parameters<typeof runProcessorCommand>[1];

      try {
        await runProcessorCommand(
          { command: 'diff {file} {file}', content: 'x', tempFilePath, timeout: 5000, cwd: tempDir },
          deps,
        );
        const shellArgs = execFileAsyncMock.mock.calls[0][1] as string[];
        const commandArg = shellArgs[shellArgs.length - 1];
        expect(commandArg).not.toContain('{file}');
        // Both placeholders replaced with the temp path.
        expect(commandArg.match(/0-a\.json/g)).toHaveLength(2);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    // Real-shell tests exercise the execFile wiring the mocked tests can't (exit codes,
    // timeouts, and shell quoting). Skipped on Windows where the POSIX tools differ.
    const describePosix = process.platform === 'win32' ? describe.skip : describe;
    describePosix('real shell', () => {
      it('echoes the temp file back (cat), even when the temp dir path contains a space', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc test-'));
        const tempFilePath = path.join(tempDir, '0-a.txt');

        try {
          const result = await runProcessorCommand({
            command: 'cat {file}',
            content: 'hello world',
            tempFilePath,
            timeout: 10000,
            cwd: tempDir,
          });
          expect(result).toBe('hello world');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('escapes a single quote in the temp path (quoteForShell)', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc-test-'));
        // A single quote in the path would break naive single-quoting; quoteForShell
        // must escape it so the real shell resolves the file.
        const tempFilePath = path.join(tempDir, "it's-0.txt");

        try {
          const result = await runProcessorCommand({
            command: 'cat {file}',
            content: 'quoted ok',
            tempFilePath,
            timeout: 10000,
            cwd: tempDir,
          });
          expect(result).toBe('quoted ok');
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('rejects when the real command exits non-zero', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc-test-'));
        const tempFilePath = path.join(tempDir, '0-a.txt');

        try {
          await expect(
            runProcessorCommand({
              command: 'cat {file} && exit 3',
              content: 'x',
              tempFilePath,
              timeout: 10000,
              cwd: tempDir,
            }),
          ).rejects.toThrow();
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      it('rejects (killed) when the real command exceeds its timeout', async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc-test-'));
        const tempFilePath = path.join(tempDir, '0-a.txt');

        try {
          await expect(
            runProcessorCommand({
              command: 'sleep 5 # {file}',
              content: 'x',
              tempFilePath,
              timeout: 100,
              cwd: tempDir,
            }),
          ).rejects.toMatchObject({ killed: true });
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  describe('logFileProcessorStatus', () => {
    it('logs active processors when enabled', () => {
      const config = createMockConfig({
        enableFileProcessors: true,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });

      logFileProcessorStatus(config);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('1 file processor(s) active'));
      expect(logger.note).not.toHaveBeenCalled();
    });

    it('logs a disabled notice when processors are configured but the gate is off', () => {
      const config = createMockConfig({
        enableFileProcessors: false,
        input: { processors: [{ pattern: '**/*.json', command: 'toon {file}' }] },
      });

      logFileProcessorStatus(config);

      expect(logger.note).toHaveBeenCalledWith(expect.stringContaining('disabled at this entry point'));
    });

    it('logs nothing when no processors are configured', () => {
      const config = createMockConfig({ enableFileProcessors: true });

      logFileProcessorStatus(config);

      expect(logger.log).not.toHaveBeenCalled();
      expect(logger.note).not.toHaveBeenCalled();
    });
  });
});
