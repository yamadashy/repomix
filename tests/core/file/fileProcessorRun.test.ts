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

    it('runs a real command end-to-end (cat echoes the temp file back)', async () => {
      // Skip on Windows where `cat` is not guaranteed to exist.
      if (process.platform === 'win32') {
        return;
      }
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-proc-test-'));
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
