import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * Register Repomix-related prompts to the MCP server
 */
export const registerPackRemoteRepositoryPrompt = (mcpServer: McpServer) => {
  // Pack Remote Repository Prompt
  mcpServer.prompt(
    'pack_remote_repository',
    'Pack a remote GitHub repository for analysis',
    {
      repository: z.string().describe('GitHub repository URL or owner/repo format (e.g., "yamadashy/repomix")'),
      includePatterns: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of glob patterns to include (e.g., "src/**,lib/**"). It is recommended to pack only necessary files.',
        ),
      ignorePatterns: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of glob patterns to ignore (e.g., "**/*.test.js,**/*.spec.js"). It is recommended to pack only necessary files.',
        ),
    },
    async ({ repository, includePatterns, ignorePatterns }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the GitHub repository at ${repository}.

First, use the pack_remote_repository tool with these parameters:
- repository: "${repository}"
${includePatterns ? `- includePatterns: "${includePatterns}"` : ''}
${ignorePatterns ? `- ignorePatterns: "${ignorePatterns}"` : ''}

Once you have the packed repository:
1. Read the code using the outputId from the tool response
2. Give me a high-level overview of this project
3. Explain its architecture and main components
4. Identify the key technologies and dependencies used
5. Highlight any interesting patterns or design decisions

Please be thorough in your analysis.`,
            },
          },
        ],
      };
    },
  );
};
