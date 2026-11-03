import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { runCli } from '../../../src/cli/cliRun.js';
import type { CliOptions } from '../../../src/cli/types.js';
import { PathScopeError } from '../../../src/mcp/pathScope.js';
import { logger, repomixLogLevels } from '../../../src/shared/logger.js';
import type { MockedDeps } from '../../testing/depsDoubles.js';

// Type guard for structured content with result property
function hasResult(obj: unknown): obj is { result: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'result' in obj &&
    typeof (obj as Record<string, unknown>).result === 'string'
  );
}

import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  createToolWorkspace,
  formatPackToolResponse,
  generateOutputId,
  getOutputFilePath,
  registerOutputFile,
  runCliPreservingLogLevel,
  sandboxErrorReason,
} from '../../../src/mcp/tools/mcpToolRuntime.js';
import { structuredContentOf } from '../../testing/testUtils.js';

describe('mcpToolRuntime', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('sandboxErrorReason', () => {
    const errnoError = (code: string) => Object.assign(new Error(`${code}: /host/secret/path`), { code });

    it('should pass a PathScopeError message through unchanged', () => {
      expect(sandboxErrorReason(new PathScopeError('path must be relative'))).toBe('path must be relative');
    });

    it.each([
      ['ENOENT', 'not found'],
      ['EACCES', 'permission denied'],
      ['EPERM', 'permission denied'],
      ['EISDIR', 'path is a directory'],
      ['ENOTDIR', 'path is not a directory'],
      ['ELOOP', 'too many symbolic links'],
      ['ENAMETOOLONG', 'path name too long'],
      ['EMFILE', 'too many open files'],
      ['ENFILE', 'too many open files'],
      ['EIO', 'operation failed'],
    ])('should map %s to a reason without the host path', (code, reason) => {
      expect(sandboxErrorReason(errnoError(code))).toBe(reason);
    });

    it.each([[new Error('boom')], ['string error'], [undefined]])(
      'should fall back to a generic reason for %j',
      (error) => {
        expect(sandboxErrorReason(error)).toBe('operation failed');
      },
    );
  });

  describe('registerOutputFile and getOutputFilePath', () => {
    it('should register and retrieve output file paths', () => {
      const id = 'test-id';
      const filePath = '/path/to/file.txt';

      registerOutputFile(id, filePath);
      const retrievedPath = getOutputFilePath(id);

      expect(retrievedPath).toBe(filePath);
    });

    it('should return undefined for non-existent output ID', () => {
      const retrievedPath = getOutputFilePath('non-existent-id');
      expect(retrievedPath).toBeUndefined();
    });
  });

  describe('createToolWorkspace', () => {
    const tmpBaseDir = path.join('/tmp/repomix', 'mcp-outputs');
    let deps: MockedDeps<NonNullable<Parameters<typeof createToolWorkspace>[0]>>;

    beforeEach(() => {
      deps = {
        getRepomixTmpDir: vi.fn().mockReturnValue('/tmp/repomix'),
        mkdir: vi.fn().mockResolvedValue(undefined),
        mkdtemp: vi.fn().mockResolvedValue('/tmp/repomix/mcp-outputs/temp-dir'),
      };
    });

    it('should create a temporary directory for tool operations', async () => {
      const tempDir = await createToolWorkspace(deps);

      expect(deps.getRepomixTmpDir).toHaveBeenCalled();
      expect(deps.mkdir).toHaveBeenCalledWith(tmpBaseDir, { recursive: true });
      expect(deps.mkdtemp).toHaveBeenCalledWith(`${tmpBaseDir}/`);
      expect(tempDir).toBe('/tmp/repomix/mcp-outputs/temp-dir');
    });

    it('should throw an error if directory creation fails', async () => {
      deps.mkdir.mockRejectedValue(new Error('Failed to create directory'));

      await expect(createToolWorkspace(deps)).rejects.toThrow(
        'Failed to create temporary directory: Failed to create directory',
      );
    });
  });

  describe('generateOutputId', () => {
    it('should generate a unique output ID', () => {
      const randomBytes = vi.fn().mockReturnValue({ toString: () => 'abcdef1234567890' });

      const outputId = generateOutputId({ randomBytes });

      expect(randomBytes).toHaveBeenCalledWith(8);
      expect(outputId).toBe('abcdef1234567890');
    });

    it('should encode 8 random bytes as 16 hex characters by default', () => {
      expect(generateOutputId()).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('formatToolResponse', () => {
    let tempDir: string;
    let outputFilePath: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-mcp-runtime-'));
      outputFilePath = path.join(tempDir, 'output.xml');
      await fs.writeFile(outputFilePath, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should format a tool response with directory context', async () => {
      const context = { directory: '/path/to/dir' };
      const metrics = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        totalLines: 0, // Will be calculated in formatToolResponse
        fileCharCounts: {
          'file1.js': 500,
          'file2.js': 300,
          'file3.js': 200,
        },
        fileTokenCounts: {
          'file1.js': 100,
          'file2.js': 60,
          'file3.js': 40,
        },
        processedFiles: [],
        safeFilePaths: [],
      };

      const response = await formatPackToolResponse(context, metrics, outputFilePath);

      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      // Check that the structured content contains the expected result JSON
      const structuredContent = response.structuredContent;
      expect(structuredContent).toHaveProperty('result');

      if (!hasResult(structuredContent)) {
        throw new Error('Expected structuredContent to have a result property of type string');
      }

      const resultJson = JSON.parse(structuredContent.result);
      expect(resultJson.directory).toBe('/path/to/dir');
      expect(resultJson.outputId).toMatch(/^[0-9a-f]{16}$/);
      expect(resultJson.outputId).toBe(structuredContentOf(response).outputId);
      expect(getOutputFilePath(resultJson.outputId)).toBe(outputFilePath);
      expect(resultJson.metrics.totalFiles).toBe(10);
      expect(resultJson.metrics.totalLines).toBe(5);
      expect(response).toHaveProperty('structuredContent');
      expect(response.structuredContent).toHaveProperty('result');
      expect(response.structuredContent).toHaveProperty('description');
      expect(response.structuredContent).toHaveProperty('directoryStructure');
    });

    it('should format a tool response with repository context', async () => {
      const context = { repository: 'user/repo' };
      const metrics = {
        totalFiles: 5,
        totalCharacters: 500,
        totalTokens: 100,
        totalLines: 0, // Will be calculated in formatToolResponse
        fileCharCounts: {
          'file1.js': 300,
          'file2.js': 200,
        },
        fileTokenCounts: {
          'file1.js': 60,
          'file2.js': 40,
        },
        processedFiles: [],
        safeFilePaths: [],
      };

      const response = await formatPackToolResponse(context, metrics, outputFilePath);

      // Check that the structured content contains the expected result JSON
      const structuredContent = response.structuredContent;
      expect(structuredContent).toHaveProperty('result');

      if (!hasResult(structuredContent)) {
        throw new Error('Expected structuredContent to have a result property of type string');
      }

      const resultJson = JSON.parse(structuredContent.result);
      expect(resultJson.repository).toBe('user/repo');
      expect(resultJson.directory).toBeUndefined();
      expect(resultJson.metrics.totalLines).toBe(5);
    });

    it('should limit the number of top files based on the parameter', async () => {
      const context = {};
      const metrics = {
        totalFiles: 10,
        totalCharacters: 1000,
        totalTokens: 200,
        totalLines: 0, // Will be calculated in formatToolResponse
        fileCharCounts: {
          'file1.js': 500,
          'file2.js': 300,
          'file3.js': 200,
          'file4.js': 100,
          'file5.js': 50,
          'file6.js': 25,
        },
        fileTokenCounts: {
          'file1.js': 100,
          'file2.js': 60,
          'file3.js': 40,
          'file4.js': 20,
          'file5.js': 10,
          'file6.js': 5,
        },
        processedFiles: [],
        safeFilePaths: [],
      };
      const topFilesLen = 3;

      const response = await formatPackToolResponse(context, metrics, outputFilePath, topFilesLen);

      // Check that the structured content contains the expected result JSON
      const structuredContent = response.structuredContent;
      expect(structuredContent).toHaveProperty('result');

      if (!hasResult(structuredContent)) {
        throw new Error('Expected structuredContent to have a result property of type string');
      }

      const result = JSON.parse(structuredContent.result);
      expect(result.metrics.topFiles).toHaveLength(3);
      expect(result.metrics.topFiles[0].path).toBe('file1.js');
      expect(result.metrics.topFiles[1].path).toBe('file2.js');
      expect(result.metrics.topFiles[2].path).toBe('file3.js');
      expect(result.metrics.totalLines).toBe(5);
    });

    it('sandboxed scope omits host paths from the pack response', async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'iso-root-'));
      const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'iso-out-'));
      const sandboxOutputFilePath = path.join(outDir, 'repomix-output.xml');
      await fs.writeFile(sandboxOutputFilePath, '<files>\n<file path="src/a.ts">x</file>\n</files>\n');

      const metrics = {
        totalFiles: 1,
        totalCharacters: 1,
        totalTokens: 1,
        fileCharCounts: { 'src/a.ts': 1 },
        fileTokenCounts: { 'src/a.ts': 1 },
        processedFiles: [],
        safeFilePaths: ['src/a.ts'],
      };

      const result = await formatPackToolResponse({ directory: root }, metrics, sandboxOutputFilePath, 5, false, {
        sandboxed: true,
        root,
      });

      const text = JSON.stringify(result);
      expect(text).not.toContain(root); // no host workspace path
      expect(text).not.toContain(outDir); // no host output path
      expect(structuredContentOf(result).outputFilePath).toBe('');
      expect(structuredContentOf(result).description).not.toContain('read the file directly using path');

      await fs.rm(root, { recursive: true, force: true });
      await fs.rm(outDir, { recursive: true, force: true });
    });
  });

  describe('buildMcpToolSuccessResponse', () => {
    it('should create a successful response with structured content', () => {
      const structuredContent = { description: 'Operation completed successfully' };
      const response = buildMcpToolSuccessResponse(structuredContent);

      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredContent, null, 2),
          },
        ],
        structuredContent: structuredContent,
      });
      expect(response.isError).toBeUndefined();
    });

    it('should create a successful response with complex structured content', () => {
      const structuredContent = {
        description: 'Operation completed successfully',
        results: ['First result', 'Second result', 'Third result'],
        count: 3,
      };
      const response = buildMcpToolSuccessResponse(structuredContent);

      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredContent, null, 2),
          },
        ],
        structuredContent: structuredContent,
      });
      expect(response.isError).toBeUndefined();
    });

    it('should create a successful response with undefined structured content', () => {
      const structuredContent = undefined;
      const response = buildMcpToolSuccessResponse(structuredContent);

      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: 'null',
          },
        ],
        structuredContent: structuredContent,
      });
      expect(response.isError).toBeUndefined();
    });
  });

  describe('buildMcpToolErrorResponse', () => {
    it('should create an error response with structured content', () => {
      const errorContent = { message: 'Something went wrong' };
      const response = buildMcpToolErrorResponse(errorContent);

      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorContent, null, 2),
          },
        ],
      });
    });

    it('should create an error response with complex structured content', () => {
      const errorContent = {
        message: 'Multiple errors occurred',
        errors: ['Error 1', 'Error 2', 'Error 3'],
        code: 'MULTIPLE_ERRORS',
      };
      const response = buildMcpToolErrorResponse(errorContent);

      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorContent, null, 2),
          },
        ],
      });
    });

    it('should create an error response with undefined structured content', () => {
      const errorContent = undefined;
      const response = buildMcpToolErrorResponse(errorContent);

      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'null',
          },
        ],
        structuredContent: errorContent,
      });
    });
  });

  describe('runCliPreservingLogLevel', () => {
    const cliOptions = {} as CliOptions;
    // The CLI is only observed here: runCli itself owns the log level the wrapper protects.
    let runCliMock: ReturnType<typeof vi.fn<typeof runCli>>;
    const run = (...args: Parameters<typeof runCliPreservingLogLevel>) =>
      runCliPreservingLogLevel(args[0], args[1], args[2], args[3], { runCli: runCliMock });

    beforeEach(() => {
      runCliMock = vi.fn<typeof runCli>();
    });

    const deferred = () => {
      let release = (): void => {};
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      return { promise, resolve: () => release() };
    };

    const cliSilencesTheLogger = () => {
      runCliMock.mockImplementation(async () => {
        // What runCli does for { quiet: true } / stdout mode: repoint the shared
        // singleton and leave it there.
        logger.setLogLevel(repomixLogLevels.SILENT);
        return undefined;
      });
    };

    it('should restore the log level the CLI overwrote for a quiet pack', async () => {
      logger.setLogLevel(repomixLogLevels.DEBUG);
      cliSilencesTheLogger();

      await run(['.'], '/repo', cliOptions);

      expect(logger.getLogLevel()).toBe(repomixLogLevels.DEBUG);
    });

    it('should restore the log level when the pack fails', async () => {
      logger.setLogLevel(repomixLogLevels.INFO);
      runCliMock.mockImplementation(async () => {
        logger.setLogLevel(repomixLogLevels.SILENT);
        throw new Error('pack failed');
      });

      await expect(run(['.'], '/repo', cliOptions)).rejects.toThrow('pack failed');

      expect(logger.getLogLevel()).toBe(repomixLogLevels.INFO);
    });

    it('should restore the level only when the last overlapping pack finishes', async () => {
      // The MCP SDK does not wait for a running tool handler before starting the next
      // one, so two quiet packs genuinely overlap.
      logger.setLogLevel(repomixLogLevels.DEBUG);
      const gates = [deferred(), deferred()];
      let started = 0;
      runCliMock.mockImplementation(async () => {
        const gate = gates[started++];
        logger.setLogLevel(repomixLogLevels.SILENT);
        await gate.promise;
        return undefined;
      });

      const first = run(['.'], '/repo', cliOptions);
      const second = run(['.'], '/repo', cliOptions);

      expect(logger.getLogLevel()).toBe(repomixLogLevels.SILENT);

      gates[0].resolve();
      await first;
      expect(logger.getLogLevel()).toBe(repomixLogLevels.SILENT);

      gates[1].resolve();
      await second;
      expect(logger.getLogLevel()).toBe(repomixLogLevels.DEBUG);
    });

    it('should pass the CLI result straight through', async () => {
      const cliResult = { packResult: {}, config: {} } as unknown as Awaited<ReturnType<typeof runCli>>;
      runCliMock.mockResolvedValue(cliResult);

      await expect(run(['.'], '/repo', cliOptions)).resolves.toBe(cliResult);
    });

    it('should forward directories, cwd, options and the progress callback to the CLI', async () => {
      cliSilencesTheLogger();
      const progressCallback = vi.fn();

      await run(['/a', '/b'], '/cwd', cliOptions, progressCallback);

      expect(runCliMock).toHaveBeenCalledWith(['/a', '/b'], '/cwd', cliOptions, progressCallback);
    });
  });
});
