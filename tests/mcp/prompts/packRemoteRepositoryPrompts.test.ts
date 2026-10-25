import type { McpServer } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPackRemoteRepositoryPrompt } from '../../../src/mcp/prompts/packRemoteRepositoryPrompts.js';

describe('packRemoteRepositoryPrompts', () => {
  const mockMcpServer = {
    registerPrompt: vi.fn(),
  };

  type PromptHandlerType = (args: {
    repository: string;
    includePatterns?: string;
    ignorePatterns?: string;
  }) => Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }>;

  let promptHandler: PromptHandlerType;

  beforeEach(() => {
    vi.resetAllMocks();

    registerPackRemoteRepositoryPrompt(mockMcpServer as unknown as McpServer);

    promptHandler = mockMcpServer.registerPrompt.mock.calls[0][2];
  });

  it('should register the prompt with correct parameters', () => {
    expect(mockMcpServer.registerPrompt).toHaveBeenCalledWith(
      'pack_remote_repository',
      expect.objectContaining({
        description: expect.any(String),
        argsSchema: expect.objectContaining({
          shape: expect.objectContaining({
            repository: expect.any(Object),
            includePatterns: expect.any(Object),
            ignorePatterns: expect.any(Object),
          }),
        }),
      }),
      expect.any(Function),
    );
  });

  it('should generate a prompt with repository only', async () => {
    const result = await promptHandler({ repository: 'user/repo' });

    expect(result).toHaveProperty('messages');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');
    expect(result.messages[0].content.text).toContain('Please analyze the GitHub repository at user/repo');
    expect(result.messages[0].content.text).toContain('- repository: "user/repo"');
    expect(result.messages[0].content.text).not.toContain('- includePatterns:');
    expect(result.messages[0].content.text).not.toContain('- ignorePatterns:');
  });

  it('should include includePatterns when provided', async () => {
    const result = await promptHandler({
      repository: 'user/repo',
      includePatterns: 'src/**,lib/**',
    });

    expect(result.messages[0].content.text).toContain('- includePatterns: "src/**,lib/**"');
    expect(result.messages[0].content.text).not.toContain('- ignorePatterns:');
  });

  it('should include ignorePatterns when provided', async () => {
    const result = await promptHandler({
      repository: 'user/repo',
      ignorePatterns: '**/*.test.js,**/*.spec.js',
    });

    expect(result.messages[0].content.text).toContain('- ignorePatterns: "**/*.test.js,**/*.spec.js"');
    expect(result.messages[0].content.text).not.toContain('- includePatterns:');
  });

  it('should include both patterns when provided', async () => {
    const result = await promptHandler({
      repository: 'user/repo',
      includePatterns: 'src/**,lib/**',
      ignorePatterns: '**/*.test.js,**/*.spec.js',
    });

    expect(result.messages[0].content.text).toContain('- includePatterns: "src/**,lib/**"');
    expect(result.messages[0].content.text).toContain('- ignorePatterns: "**/*.test.js,**/*.spec.js"');
  });
});
