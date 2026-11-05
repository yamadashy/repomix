import fs from 'node:fs/promises';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { registerGenerateSkillTool } from '../../../src/mcp/tools/generateSkillTool.js';
import type { runCliPreservingLogLevel } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { createMcpServerDouble, type McpServerDouble } from '../../testing/mcpServerDoubles.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig } from '../../testing/testUtils.js';

const exists = (target: string) =>
  fs.access(target).then(
    () => true,
    () => false,
  );

describe('GenerateSkillTool', () => {
  let mockServer: McpServerDouble;

  let toolHandler: (
    args: {
      directory: string;
      skillName?: string;
      compress?: boolean;
      includePatterns?: string;
      ignorePatterns?: string;
    },
    ctx?: unknown,
  ) => Promise<CallToolResult>;

  // Real temp workspace: the tool's directory checks and its claim/cleanup of the
  // skill directory run against the file system. Only the pack itself is a double.
  let tempDir: string;
  let projectDir: string;
  const skillDirOf = (name: string) => path.join(projectDir, '.claude', 'skills', name);
  let runCli: ReturnType<typeof vi.fn<typeof runCliPreservingLogLevel>>;

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

  beforeEach(async () => {
    vi.resetAllMocks();
    tempDir = await createTempDir('repomix-mcp-skill-');
    projectDir = path.join(tempDir, 'project');
    await fs.mkdir(projectDir);

    runCli = vi.fn<typeof runCliPreservingLogLevel>();
    mockServer = createMcpServerDouble();
    registerGenerateSkillTool(mockServer.server, { runCliPreservingLogLevel: runCli });
    toolHandler = mockServer.toolHandler();

    // Default runCli behavior
    runCli.mockImplementation(async (_directories, cwd, opts = {}) => ({
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
    const result = await toolHandler({
      directory: path.join('relative', 'path'),
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('absolute path');
  });

  test('should reject non-normalized paths', async () => {
    const result = await toolHandler({
      directory: [tempDir, '..', path.basename(tempDir), 'project'].join(path.sep),
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('must be normalized');
    expect(parsedResult.errorMessage).toContain(projectDir);
  });

  test('should reject inaccessible directories', async () => {
    const result = await toolHandler({
      directory: path.join(tempDir, 'nonexistent'),
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('not accessible');
  });

  test('should reject when skill directory already exists', async () => {
    const skillDir = skillDirOf('existing-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'existing');

    const result = await toolHandler({
      directory: projectDir,
      skillName: 'existing-skill',
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toContain('already exists');
    expect(runCli).not.toHaveBeenCalled();
    // The pre-existing skill is left untouched.
    await expect(fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf8')).resolves.toBe('existing');
  });

  test("a concurrent same-name call is refused and never removes the first call's skill", async () => {
    const skillDir = skillDirOf('shared-skill');
    let releaseFirst: () => void = () => {};
    let markFirstPacking: () => void = () => {};
    const firstPacking = new Promise<void>((resolve) => {
      markFirstPacking = resolve;
    });
    runCli.mockImplementationOnce(async (_directories, cwd, opts = {}) => {
      markFirstPacking();
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'first');
      return { packResult: defaultPackResult, config: createMockConfig({ cwd, skillGenerate: opts.skillGenerate }) };
    });

    const first = toolHandler({ directory: projectDir, skillName: 'shared-skill' });
    // Wait until the first call has claimed the directory and is inside the pack.
    await firstPacking;
    const second = await toolHandler({ directory: projectDir, skillName: 'shared-skill' });
    releaseFirst();
    const firstResult = await first;

    expect(second.isError).toBe(true);
    expect((second.content[0] as { text: string }).text).toContain('already exists');
    expect(firstResult.isError).toBeUndefined();
    expect(runCli).toHaveBeenCalledTimes(1);
    await expect(fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf8')).resolves.toBe('first');
  });

  test('removes the claimed skill directory only while empty when the run fails', async () => {
    runCli.mockRejectedValueOnce(new Error('pack failed'));

    const result = await toolHandler({ directory: projectDir, skillName: 'my-skill' });

    expect(result.isError).toBe(true);
    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      projectDir,
      expect.objectContaining({ skillDir: skillDirOf('my-skill') }),
      undefined,
    );
    // The empty directory this call claimed is gone, so a retry is not refused.
    expect(await exists(skillDirOf('my-skill'))).toBe(false);
  });

  test('keeps a written skill when an error is raised after writing', async () => {
    const skillDir = skillDirOf('my-skill');
    // Non-recursive cleanup: errors raised after the skill was written (e.g. an
    // exceeded output.tokenBudget) must keep the written output.
    runCli.mockImplementationOnce(async () => {
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'written');
      throw new Error('Token budget exceeded');
    });

    const result = await toolHandler({ directory: projectDir, skillName: 'my-skill' });

    expect(result.isError).toBe(true);
    await expect(fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf8')).resolves.toBe('written');
  });

  test('should generate skill with custom name', async () => {
    const result = await toolHandler({
      directory: projectDir,
      skillName: 'my-custom-skill',
    });

    expect(result.isError).toBeUndefined();
    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      projectDir,
      expect.objectContaining({
        skillGenerate: 'my-custom-skill',
        skillName: 'my-custom-skill',
        skillDir: skillDirOf('my-custom-skill'),
      }),
      undefined,
    );
  });

  test('should generate skill with auto-generated name', async () => {
    await toolHandler({
      directory: projectDir,
    });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      projectDir,
      expect.objectContaining({
        skillGenerate: 'repomix-reference-project',
        skillName: 'repomix-reference-project',
      }),
      undefined,
    );
  });

  test('should pass compress option', async () => {
    await toolHandler({
      directory: projectDir,
      compress: true,
    });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      projectDir,
      expect.objectContaining({
        compress: true,
      }),
      undefined,
    );
  });

  test('should pass include and ignore patterns', async () => {
    await toolHandler({
      directory: projectDir,
      includePatterns: '**/*.ts',
      ignorePatterns: 'test/**',
    });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      projectDir,
      expect.objectContaining({
        include: '**/*.ts',
        ignore: 'test/**',
      }),
      undefined,
    );
  });

  test('passes the request abort signal to runCli', async () => {
    const { signal } = new AbortController();
    await toolHandler({ directory: projectDir }, { mcpReq: { _meta: {}, notify: vi.fn(), signal } });

    expect(runCli).toHaveBeenCalledWith(['.'], projectDir, expect.objectContaining({ signal }), undefined);
    // A run that was not cancelled keeps the generated skill.
    expect(await exists(skillDirOf('repomix-reference-project'))).toBe(true);
  });

  test('removes the partially generated skill directory when the request is cancelled', async () => {
    const skillDir = skillDirOf('my-skill');
    const controller = new AbortController();
    runCli.mockImplementationOnce(async () => {
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'partial');
      controller.abort();
      throw controller.signal.reason;
    });
    await toolHandler(
      { directory: projectDir, skillName: 'my-skill' },
      { mcpReq: { _meta: {}, notify: vi.fn(), signal: controller.signal } },
    );

    expect(await exists(skillDir)).toBe(false);
  });

  test('should handle CLI execution failure', async () => {
    runCli.mockResolvedValue(undefined);

    const result = await toolHandler({
      directory: projectDir,
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Failed to generate skill');
  });

  test('should handle general error', async () => {
    runCli.mockRejectedValue(new Error('Unexpected error'));

    const result = await toolHandler({
      directory: projectDir,
    });

    expect(result.isError).toBe(true);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Unexpected error');
  });

  test('should return success response with skill info', async () => {
    const result = await toolHandler({
      directory: projectDir,
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
