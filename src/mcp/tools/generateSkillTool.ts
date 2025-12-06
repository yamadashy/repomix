import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { runCli } from '../../cli/cliRun.js';
import type { CliOptions } from '../../cli/types.js';
import { buildMcpToolErrorResponse, buildMcpToolSuccessResponse, convertErrorToJson } from './mcpToolRuntime.js';

const generateSkillInputSchema = z.object({
  directory: z.string().describe('Directory to pack (Absolute path)'),
  skillName: z
    .string()
    .describe(
      'Name of the skill to generate (kebab-case, max 64 chars). Will be normalized if not in kebab-case. Used for the skill directory name and SKILL.md metadata.',
    ),
  compress: z
    .boolean()
    .default(false)
    .describe(
      'Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details (default: false).',
    ),
  includePatterns: z
    .string()
    .optional()
    .describe(
      'Specify files to include using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "**/*.{js,ts}", "src/**,docs/**").',
    ),
  ignorePatterns: z
    .string()
    .optional()
    .describe(
      'Specify additional files to exclude using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "test/**,*.spec.js").',
    ),
});

const generateSkillOutputSchema = z.object({
  skillPath: z.string().describe('Path to the generated skill directory'),
  skillName: z.string().describe('Normalized name of the generated skill'),
  totalFiles: z.number().describe('Total number of files processed'),
  totalTokens: z.number().describe('Total token count of the content'),
  description: z.string().describe('Human-readable description of the skill generation results'),
});

export const registerGenerateSkillTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'generate_skill',
    {
      title: 'Generate Claude Agent Skill',
      description:
        'Generate a Claude Agent Skill from a local code directory. Creates a skill package at .claude/skills/<name>/ containing SKILL.md (entry point with metadata) and references/codebase.md (the packed codebase in Markdown format). This skill can be used by Claude to understand and reference the codebase.',
      inputSchema: generateSkillInputSchema,
      outputSchema: generateSkillOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ directory, skillName, compress, includePatterns, ignorePatterns }): Promise<CallToolResult> => {
      try {
        const cliOptions = {
          generateSkill: skillName,
          compress,
          include: includePatterns,
          ignore: ignorePatterns,
          securityCheck: true,
          quiet: true,
        } as CliOptions;

        const result = await runCli(['.'], directory, cliOptions);
        if (!result) {
          return buildMcpToolErrorResponse({
            errorMessage: 'Failed to generate skill',
          });
        }

        const { packResult, config } = result;
        const skillPath = path.join(directory, '.claude', 'skills', config.generateSkill || skillName);

        return buildMcpToolSuccessResponse({
          skillPath,
          skillName: config.generateSkill || skillName,
          totalFiles: packResult.totalFiles,
          totalTokens: packResult.totalTokens,
          description: `Successfully generated Claude Agent Skill at ${skillPath}. The skill contains ${packResult.totalFiles} files with ${packResult.totalTokens.toLocaleString()} tokens.`,
        } satisfies z.infer<typeof generateSkillOutputSchema>);
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};
