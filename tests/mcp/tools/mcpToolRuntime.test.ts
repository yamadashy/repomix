import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
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
      const outputFilePath = '/path/to/output.xml';

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
      expect(resultJson.outputId).toBe('abcdef1234567890');
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
      const outputFilePath = '/path/to/output.xml';

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
      const outputFilePath = '/path/to/output.xml';
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
});
