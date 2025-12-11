import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../../src/cli/cliRun.js';
import { registerGenerateSkillTool } from '../../../src/mcp/tools/generateSkillTool.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('node:fs/promises');
vi.mock('node:path');
vi.mock('../../../src/cli/cliRun.js');

describe('GenerateSkillTool', () => {
  const mockServer = {
    registerTool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: {
    directory: string;
    skillName?: string;
    compress?: boolean;
    includePatterns?: string;
    ignorePatterns?: string;
  }) => Promise<CallToolResult>;

  const defaultPackResult = {
    totalFiles: 10,
    totalCharacters: 1000,
    totalTokens: 500,
    fileCharCounts: { 'test.js': 100 },
    fileTokenCounts: { 'test.js': 50 },
    suspiciousFilesResults: [],
    gitDiffTokenCount: 0,
    gitLogTokenCount: 0,
    suspiciousGitDiffResults: [],
    suspiciousGitLogResults: [],
    processedFiles: [],
    safeFilePaths: [],
    skippedFiles: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    registerGenerateSkillTool(mockServer);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];

    // Default path mocks
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(path.join).mockImplementation((...args: string[]) => args.join('/'));
    vi.mocked(path.basename).mockImplementation((p: string) => p.split('/').pop() || '');
    vi.mocked(path.resolve).mockImplementation((...args: string[]) => args.join('/'));
    vi.mocked(path.normalize).mockImplementation((p: string) => p);

    // Default: directory doesn't exist (for skill dir check)
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    // Default runCli behavior
    vi.mocked(runCli).mockImplementation(async (_directories, cwd, opts = {}) => ({
      packResult: defaultPackResult,
      config: createMockConfig({
        cwd,
        skillGenerate: opts.skillGenerate,
      }),
    }));
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'generate_skill',
      expect.objectContaining({
        title: 'Generate Claude Agent Skill',
        description: expect.stringContaining('Generate a Claude Agent Skill'),
      }),
      expect.any(Function),
    );
  });

  test('should reject relative paths', async () => {
    vi.mocked(path.isAbsolute).mockReturnValue(false);

    const result = await toolHandler({
      directory: 'relative/path',
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('absolute path');
  });

  test('should reject non-normalized paths', async () => {
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(path.normalize).mockReturnValue('/test/project');

    const result = await toolHandler({
      directory: '/test/../test/project',
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('must be normalized');
    expect(parsedResult.errorMessage).toContain('/test/project');
  });

  test('should reject inaccessible directories', async () => {
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    // First access check (directory) fails
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

    const result = await toolHandler({
      directory: '/nonexistent/path',
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('not accessible');
  });

  test('should reject when skill directory already exists', async () => {
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    // First access check (directory) succeeds
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined) // Directory exists
      .mockResolvedValueOnce(undefined); // Skill directory also exists

    const result = await toolHandler({
      directory: '/test/project',
      skillName: 'existing-skill',
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('already exists');
  });

  test('should generate skill with custom name', async () => {
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    // First access check (directory) succeeds
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined) // Directory exists
      .mockRejectedValueOnce(new Error('ENOENT')); // Skill directory doesn't exist

    const result = await toolHandler({
      directory: '/test/project',
      skillName: 'my-custom-skill',
    });

    expect(result.isError).toBeUndefined();
    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      '/test/project',
      expect.objectContaining({
        skillGenerate: 'my-custom-skill',
        skillName: 'my-custom-skill',
        skillDir: expect.stringContaining('my-custom-skill'),
      }),
    );
  });

  test('should generate skill with auto-generated name', async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined) // Directory exists
      .mockRejectedValueOnce(new Error('ENOENT')); // Skill directory doesn't exist

    await toolHandler({
      directory: '/test/project',
    });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      '/test/project',
      expect.objectContaining({
        skillGenerate: 'repomix-reference-project',
        skillName: 'repomix-reference-project',
      }),
    );
  });

  test('should pass compress option', async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'));

    await toolHandler({
      directory: '/test/project',
      compress: true,
    });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      '/test/project',
      expect.objectContaining({
        compress: true,
      }),
    );
  });

  test('should pass include and ignore patterns', async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'));

    await toolHandler({
      directory: '/test/project',
      includePatterns: '**/*.ts',
      ignorePatterns: 'test/**',
    });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      '/test/project',
      expect.objectContaining({
        include: '**/*.ts',
        ignore: 'test/**',
      }),
    );
  });

  test('should handle CLI execution failure', async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'));
    vi.mocked(runCli).mockResolvedValue(undefined);

    const result = await toolHandler({
      directory: '/test/project',
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Failed to generate skill');
  });

  test('should handle general error', async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'));
    vi.mocked(runCli).mockRejectedValue(new Error('Unexpected error'));

    const result = await toolHandler({
      directory: '/test/project',
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Unexpected error');
  });

  test('should return success response with skill info', async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'));

    const result = await toolHandler({
      directory: '/test/project',
      skillName: 'test-skill',
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.skillName).toBe('test-skill');
    expect(parsedResult.totalFiles).toBe(10);
    expect(parsedResult.totalTokens).toBe(500);
    expect(parsedResult.description).toContain('Successfully generated');
  });
});
