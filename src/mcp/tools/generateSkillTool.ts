import fs from 'node:fs/promises';
import path from 'node:path';
import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getSkillBaseDir } from '../../cli/prompts/skillPrompts.js';
import type { CliOptions } from '../../cli/types.js';
import { generateDefaultSkillName, validateSkillName } from '../../core/skill/skillUtils.js';
import { withMcpProgress } from './mcpProgress.js';
import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  convertErrorToJson,
  runCliPreservingLogLevel,
} from './mcpToolRuntime.js';

const generateSkillInputSchema = z.object({
  directory: z.string().describe('Directory to pack (Absolute path)'),
  skillName: z
    .string()
    .optional()
    .describe(
      'Name of the skill to generate (kebab-case, max 64 chars). Will be normalized if not in kebab-case. Used for the skill directory name and SKILL.md metadata. If omitted, auto-generates as "repomix-reference-<folder-name>".',
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
      description: `Generate a Claude Agent Skill from a local code directory. Creates a skill package containing SKILL.md (entry point with metadata) and references/ folder with summary.md, project-structure.md, files.md, and optionally tech-stacks.md.

This tool creates Project Skills in <project>/.claude/skills/<name>/, which are shared with the team via version control.

Output Structure:
  .claude/skills/<skill-name>/
  ├── SKILL.md                    # Entry point with usage guide
  └── references/
      ├── summary.md              # Purpose, format, and statistics
      ├── project-structure.md    # Directory tree with line counts
      ├── files.md                # All file contents
      └── tech-stacks.md          # Languages, frameworks, dependencies (if detected)

Example Path:
  /path/to/project/.claude/skills/repomix-reference-myproject/`,
      inputSchema: generateSkillInputSchema,
      outputSchema: generateSkillOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ directory, skillName, compress, includePatterns, ignorePatterns }, ctx): Promise<CallToolResult> => {
      // Fires on notifications/cancelled for this request or when the transport closes.
      const signal = ctx?.mcpReq.signal;
      // Set only after this call created the skill directory, so cleanup never removes a
      // directory another call (or the user) owns.
      let createdSkillDir: string | undefined;
      let succeeded = false;
      try {
        // Validate directory is an absolute path
        if (!path.isAbsolute(directory)) {
          return buildMcpToolErrorResponse({
            errorMessage: `Directory must be an absolute path: ${directory}`,
          });
        }

        // Validate directory path is normalized (no .., ., or redundant separators)
        const normalizedDirectory = path.normalize(directory);
        if (normalizedDirectory !== directory) {
          return buildMcpToolErrorResponse({
            errorMessage: `Directory path must be normalized. Use "${normalizedDirectory}" instead of "${directory}"`,
          });
        }

        // Check if directory exists and is accessible
        try {
          await fs.access(directory);
        } catch {
          return buildMcpToolErrorResponse({
            errorMessage: `Directory not accessible: ${directory}`,
          });
        }

        // Pre-compute skill name and directory to avoid interactive prompts
        // MCP is non-interactive, so we must specify skillDir explicitly
        // Normalize user-provided skill name to ensure consistent kebab-case format
        const actualSkillName = skillName ? validateSkillName(skillName) : generateDefaultSkillName([directory]);
        const skillDir = path.join(getSkillBaseDir(directory, 'project'), actualSkillName);

        // Claim the skill directory atomically (MCP cannot prompt for overwrite): a
        // non-recursive mkdir fails with EEXIST if it already exists, so of two
        // concurrent same-name calls only one owns the directory.
        await fs.mkdir(path.dirname(skillDir), { recursive: true });
        try {
          await fs.mkdir(skillDir);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          return buildMcpToolErrorResponse({
            errorMessage: `Skill directory already exists: ${skillDir}. Please remove it first or use a different skill name.`,
          });
        }
        createdSkillDir = skillDir;

        const cliOptions = {
          skillGenerate: actualSkillName,
          skillName: actualSkillName,
          skillDir,
          compress,
          include: includePatterns,
          ignore: ignorePatterns,
          securityCheck: true,
          quiet: true,
          signal,
        } as CliOptions;

        const result = await withMcpProgress(ctx, { sandboxed: false }, (progressCallback) =>
          runCliPreservingLogLevel(['.'], directory, cliOptions, progressCallback),
        );
        if (!result) {
          return buildMcpToolErrorResponse({
            errorMessage: 'Failed to generate skill',
          });
        }

        const { packResult } = result;
        succeeded = true;

        return buildMcpToolSuccessResponse({
          skillPath: skillDir,
          skillName: actualSkillName,
          totalFiles: packResult.totalFiles,
          totalTokens: packResult.totalTokens,
          description: `Successfully generated Claude Agent Skill at ${skillDir}. The skill contains ${packResult.totalFiles} files with ${packResult.totalTokens.toLocaleString()} tokens.`,
        } satisfies z.infer<typeof generateSkillOutputSchema>);
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      } finally {
        // Remove what this call claimed so a retry is not refused with "Skill directory
        // already exists". A cancelled run may have left a partial skill, so it goes
        // entirely. Other failures only drop the directory while it is still empty: some
        // errors, such as an exceeded output.tokenBudget, are raised after the skill was
        // written, and that output is kept as before.
        if (!succeeded && createdSkillDir) {
          if (signal?.aborted) {
            await fs.rm(createdSkillDir, { recursive: true, force: true }).catch(() => {});
          } else {
            await fs.rmdir(createdSkillDir).catch(() => {});
          }
        }
      }
    },
  );
};
