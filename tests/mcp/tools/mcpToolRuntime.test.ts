import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createToolWorkspace,
  formatToolError,
  formatToolResponse,
  generateOutputId,
  getOutputFilePath,
  registerOutputFile,
} from '../../../src/mcp/tools/mcpToolRuntime.js';

vi.mock('node:fs/promises');
vi.mock('node:path');
vi.mock('node:os');
vi.mock('node:crypto');

describe('mcpToolRuntime', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
    beforeEach(() => {
      vi.mocked(os.tmpdir).mockReturnValue('/tmp');
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.mkdtemp).mockResolvedValue('/tmp/repomix/mcp-outputs/temp-dir');
    });

    it('should create a temporary directory for tool operations', async () => {
      const tempDir = await createToolWorkspace();

      expect(os.tmpdir).toHaveBeenCalled();
      expect(path.join).toHaveBeenCalledWith('/tmp', 'repomix', 'mcp-outputs');
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/repomix/mcp-outputs', { recursive: true });
      expect(fs.mkdtemp).toHaveBeenCalledWith('/tmp/repomix/mcp-outputs/');
      expect(tempDir).toBe('/tmp/repomix/mcp-outputs/temp-dir');
    });

    it('should throw an error if directory creation fails', async () => {
      const error = new Error('Failed to create directory');
      vi.mocked(fs.mkdir).mockRejectedValue(error);

      await expect(createToolWorkspace()).rejects.toThrow(
        'Failed to create temporary directory: Failed to create directory',
      );
    });
  });

  describe('generateOutputId', () => {
    it('should generate a unique output ID', () => {
      vi.mocked(crypto.randomBytes).mockImplementation(() => ({
        toString: () => 'abcdef1234567890',
      }));

      const outputId = generateOutputId();

      expect(crypto.randomBytes).toHaveBeenCalledWith(8);
      expect(outputId).toBe('abcdef1234567890');
    });
  });

  describe('formatToolResponse', () => {
    beforeEach(() => {
      vi.mocked(crypto.randomBytes).mockImplementation(() => ({
        toString: () => 'abcdef1234567890',
      }));
      vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5' as unknown as Buffer);
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
      };
      const outputFilePath = '/path/to/output.xml';

      const response = await formatToolResponse(context, metrics, outputFilePath);

      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(4);
      expect(response.content[0].type).toBe('text');
      expect(response.content[1].type).toBe('text');
      expect(response.content[1].text).toContain('"directory": "/path/to/dir"');
      expect(response.content[1].text).toContain('"outputId": "abcdef1234567890"');
      expect(response.content[1].text).toContain('"totalFiles": 10');
      expect(response.content[1].text).toContain('"totalLines": 5');
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
      };
      const outputFilePath = '/path/to/output.xml';

      const response = await formatToolResponse(context, metrics, outputFilePath);

      expect(response.content[1].text).toContain('"repository": "user/repo"');
      expect(response.content[1].text).not.toContain('"directory":');
      expect(response.content[1].text).toContain('"totalLines": 5');
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
      };
      const outputFilePath = '/path/to/output.xml';
      const topFilesLen = 3;

      const response = await formatToolResponse(context, metrics, outputFilePath, topFilesLen);

      const jsonContent = JSON.parse(response.content[1].text as string);
      expect(jsonContent.metrics.topFiles).toHaveLength(3);
      expect(jsonContent.metrics.topFiles[0].path).toBe('file1.js');
      expect(jsonContent.metrics.topFiles[1].path).toBe('file2.js');
      expect(jsonContent.metrics.topFiles[2].path).toBe('file3.js');
      expect(jsonContent.metrics.totalLines).toBe(5);
    });
  });

  describe('formatToolError', () => {
    it('should format an error message with Error object', () => {
      const error = new Error('Something went wrong');

      const response = formatToolError(error);

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('"success": false');
      expect(response.content[0].text).toContain('"error": "Something went wrong"');
    });

    it('should format an error message with string error', () => {
      const error = 'String error message';

      const response = formatToolError(error);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('"error": "String error message"');
    });
  });
});
