import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getSubmoduleNames, loadMonorepoConfig } from '../config/monorepoConfigLoader.js';
import { DependencyGraph } from '../dependency/dependencyGraph.js';
import { validateProjectRoot } from '../security/pathValidator.js';
import { buildMcpToolErrorResponse, buildMcpToolSuccessResponse, convertErrorToJson } from './mcpToolRuntime.js';

const listSubmodulesInputSchema = z.object({
  showDependencies: z.boolean().default(false).describe('Include dependency relationships in the response'),
  showStats: z.boolean().default(false).describe('Include dependency graph statistics'),
  projectRoot: z
    .string()
    .max(4096)
    .optional()
    .describe('Project root directory (defaults to current working directory)'),
});

const listSubmodulesOutputSchema = z.object({
  submodules: z.array(
    z.object({
      name: z.string().describe('Submodule name'),
      path: z.string().describe('Path relative to project root'),
      description: z.string().optional().describe('Human-readable description'),
      isGitSubmodule: z.boolean().describe('Whether this is a git submodule'),
      dependencies: z.array(z.string()).optional().describe('Direct dependencies'),
      dependents: z.array(z.string()).optional().describe('Submodules that depend on this'),
    }),
  ),
  stats: z
    .object({
      totalNodes: z.number(),
      totalEdges: z.number(),
      leafNodes: z.number(),
      rootNodes: z.number(),
      maxDepth: z.number(),
    })
    .optional(),
  cycles: z.array(z.string()).optional().describe('Detected dependency cycles (if any)'),
});

/**
 * Register the list_submodules MCP tool
 */
export const registerListSubmodulesTool = (mcpServer: McpServer): void => {
  mcpServer.registerTool(
    'list_submodules',
    {
      title: 'List Submodules',
      description:
        'List all configured submodules in the monorepo. Shows names, paths, and optionally dependency relationships. Requires a .repomix-monorepo.json configuration file.',
      inputSchema: listSubmodulesInputSchema,
      outputSchema: listSubmodulesOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ showDependencies, showStats, projectRoot }): Promise<CallToolResult> => {
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

        const submoduleNames = getSubmoduleNames(config);

        // Build dependency graph if needed
        let depGraph: DependencyGraph | null = null;
        if (showDependencies || showStats) {
          depGraph = new DependencyGraph(config);
        }

        // Build submodule list
        const submodules = submoduleNames.map((name) => {
          const sub = config.submodules[name];
          const result: {
            name: string;
            path: string;
            description?: string;
            isGitSubmodule: boolean;
            dependencies?: string[];
            dependents?: string[];
          } = {
            name,
            path: sub.path,
            description: sub.description,
            isGitSubmodule: sub.isGitSubmodule,
          };

          if (showDependencies && depGraph) {
            result.dependencies = depGraph.getDirectDependencies(name);
            result.dependents = depGraph.getDependents(name);
          }

          return result;
        });

        // Build response
        const response: {
          submodules: typeof submodules;
          stats?: ReturnType<DependencyGraph['getStats']>;
          cycles?: string[];
        } = {
          submodules,
        };

        if (showStats && depGraph) {
          response.stats = depGraph.getStats();

          // Check for cycles
          const cycles = depGraph.detectCycles();
          if (cycles.length > 0) {
            response.cycles = cycles.map((c) => c.description);
          }
        }

        return buildMcpToolSuccessResponse(response);
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};
