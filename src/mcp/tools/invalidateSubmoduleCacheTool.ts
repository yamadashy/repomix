import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CacheManager } from '../cache/cacheManager.js';
import { getSubmoduleNames, loadMonorepoConfig } from '../config/monorepoConfigLoader.js';
import { validateProjectRoot } from '../security/pathValidator.js';
import { buildMcpToolErrorResponse, buildMcpToolSuccessResponse, convertErrorToJson } from './mcpToolRuntime.js';

const invalidateSubmoduleCacheInputSchema = z.object({
  submodules: z
    .array(z.string().min(1).max(255))
    .max(100)
    .optional()
    .describe('List of submodule names to invalidate. If not provided, invalidates all caches.'),
  projectRoot: z
    .string()
    .max(4096)
    .optional()
    .describe('Project root directory (defaults to current working directory)'),
});

const invalidateSubmoduleCacheOutputSchema = z.object({
  invalidated: z.array(z.string()).describe('List of submodules whose cache was invalidated'),
  skipped: z.array(z.string()).optional().describe('List of submodules that were skipped (not found)'),
  message: z.string().describe('Human-readable summary'),
});

/**
 * Register the invalidate_submodule_cache MCP tool
 */
export const registerInvalidateSubmoduleCacheTool = (mcpServer: McpServer): void => {
  mcpServer.registerTool(
    'invalidate_submodule_cache',
    {
      title: 'Invalidate Submodule Cache',
      description:
        'Invalidate cached content for one or more submodules. Forces regeneration on next access. Use after making changes to submodule code.',
      inputSchema: invalidateSubmoduleCacheInputSchema,
      outputSchema: invalidateSubmoduleCacheOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ submodules, projectRoot }): Promise<CallToolResult> => {
      try {
        // Validate and normalize project root to prevent path traversal
        const rootDir = validateProjectRoot(projectRoot);

        // Load configuration
        const config = await loadMonorepoConfig(rootDir);
        if (!config) {
          return buildMcpToolErrorResponse({
            errorMessage:
              '.repomix-monorepo.json not found. Please run init_monorepo_config first to generate configuration.',
          });
        }

        const cacheDir = path.join(rootDir, config.cache.directory);
        const cacheManager = new CacheManager(cacheDir, rootDir);

        // Determine which submodules to invalidate
        const allSubmodules = getSubmoduleNames(config);
        const toInvalidate = submodules && submodules.length > 0 ? submodules : allSubmodules;

        const invalidated: string[] = [];
        const skipped: string[] = [];

        for (const name of toInvalidate) {
          if (allSubmodules.includes(name)) {
            await cacheManager.invalidate(name);
            invalidated.push(name);
          } else {
            skipped.push(name);
          }
        }

        // Build message
        let message = '';
        if (invalidated.length > 0) {
          message = `Invalidated cache for ${invalidated.length} submodule(s): ${invalidated.join(', ')}`;
        }
        if (skipped.length > 0) {
          message += message ? '. ' : '';
          message += `Skipped ${skipped.length} unknown submodule(s): ${skipped.join(', ')}`;
        }
        if (invalidated.length === 0 && skipped.length === 0) {
          message = 'No submodules to invalidate';
        }

        return buildMcpToolSuccessResponse({
          invalidated,
          skipped: skipped.length > 0 ? skipped : undefined,
          message,
        });
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};
