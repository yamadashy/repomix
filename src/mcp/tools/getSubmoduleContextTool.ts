import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { runCli } from '../../cli/cliRun.js';
import type { CliOptions } from '../../cli/types.js';
import { defaultFilePathMap } from '../../config/configSchema.js';
import { CacheManager } from '../cache/cacheManager.js';
import { getSubmodule, loadMonorepoConfig } from '../config/monorepoConfigLoader.js';
import { DependencyGraph } from '../dependency/dependencyGraph.js';
import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  convertErrorToJson,
  createToolWorkspace,
} from './mcpToolRuntime.js';

const getSubmoduleContextInputSchema = z.object({
  submoduleName: z.string().describe('Name of the submodule to load (as defined in .repomix-monorepo.json)'),
  includeDependencies: z.boolean().default(false).describe('Whether to include dependency submodules in the response'),
  forceRegenerate: z.boolean().default(false).describe('Force regenerate cache even if valid cache exists'),
  compress: z.boolean().default(true).describe('Enable Tree-sitter compression to reduce token usage (~70% reduction)'),
  projectRoot: z.string().optional().describe('Project root directory (defaults to current working directory)'),
});

const getSubmoduleContextOutputSchema = z.object({
  submodule: z.string().describe('Name of the requested submodule'),
  content: z.string().describe('Packed content of the submodule'),
  dependencies: z
    .record(z.string(), z.string())
    .optional()
    .describe('Map of dependency submodule names to their content'),
  metadata: z.object({
    tokenCount: z.number().describe('Estimated total token count'),
    loadedSubmodules: z.array(z.string()).describe('List of submodules that were loaded'),
    cacheStatus: z.array(
      z.object({
        submodule: z.string(),
        fromCache: z.boolean(),
      }),
    ),
  }),
});

/**
 * Register the get_submodule_context MCP tool
 */
export const registerGetSubmoduleContextTool = (mcpServer: McpServer): void => {
  mcpServer.registerTool(
    'get_submodule_context',
    {
      title: 'Get Submodule Context',
      description:
        'Get packed content for a specific submodule in a monorepo with caching support. Requires a .repomix-monorepo.json configuration file. Use list_submodules to see available submodules.',
      inputSchema: getSubmoduleContextInputSchema,
      outputSchema: getSubmoduleContextOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ submoduleName, includeDependencies, forceRegenerate, compress, projectRoot }): Promise<CallToolResult> => {
      try {
        const rootDir = projectRoot || process.cwd();

        // 1. Load configuration
        const config = await loadMonorepoConfig(rootDir);
        if (!config) {
          return buildMcpToolErrorResponse({
            errorMessage:
              '.repomix-monorepo.json not found. Please run init_monorepo_config first to generate configuration.',
          });
        }

        const submodule = getSubmodule(config, submoduleName);
        if (!submodule) {
          return buildMcpToolErrorResponse({
            errorMessage: `Submodule "${submoduleName}" not found in configuration. Use list_submodules to see available submodules.`,
          });
        }

        // 2. Determine submodules to load
        const submodulesToLoad = [submoduleName];
        if (includeDependencies) {
          const depGraph = new DependencyGraph(config);
          const deps = depGraph.getAllDependencies(submoduleName);
          submodulesToLoad.push(...deps);
        }

        // 3. Initialize cache manager
        const cacheDir = path.join(rootDir, config.cache.directory);
        const cacheManager = new CacheManager(cacheDir, rootDir);

        // 4. Load or generate content for each submodule
        const contents: Record<string, string> = {};
        const cacheStatus: Array<{ submodule: string; fromCache: boolean }> = [];

        for (const name of submodulesToLoad) {
          const subConfig = config.submodules[name];
          if (!subConfig) {
            continue; // Skip if dependency not found in config
          }

          // Check cache first
          if (config.cache.enabled && !forceRegenerate) {
            const cached = await cacheManager.get(name, subConfig.path, subConfig.isGitSubmodule);
            if (cached) {
              contents[name] = cached.content;
              cacheStatus.push({ submodule: name, fromCache: true });
              continue;
            }
          }

          // Generate new content
          const content = await generateSubmoduleContent(rootDir, subConfig.path, {
            compress: compress ?? config.repomix.compress,
            style: config.repomix.style,
            includePatterns: subConfig.includePatterns?.join(','),
            ignorePatterns: subConfig.ignorePatterns?.join(','),
            showLineNumbers: config.repomix.showLineNumbers,
            removeComments: config.repomix.removeComments,
          });

          contents[name] = content.output;
          cacheStatus.push({ submodule: name, fromCache: false });

          // Save to cache
          if (config.cache.enabled) {
            const gitCommit = await cacheManager.getSubmoduleGitCommit(subConfig.path, subConfig.isGitSubmodule);
            await cacheManager.set(name, content.output, {
              submodule: name,
              gitCommit,
              fileCount: content.fileCount,
              tokenCount: content.tokenCount,
              dependencies: subConfig.dependencies,
              repomixVersion: '1.0.0', // TODO: Get from package.json
              compressed: compress,
              isGitSubmodule: subConfig.isGitSubmodule,
            });
          }
        }

        // 5. Calculate total tokens
        const totalTokens = Object.values(contents).reduce((sum, content) => sum + estimateTokens(content), 0);

        // 6. Build response
        const mainContent = contents[submoduleName];
        const dependencyContents = includeDependencies
          ? Object.fromEntries(Object.entries(contents).filter(([k]) => k !== submoduleName))
          : undefined;

        return buildMcpToolSuccessResponse({
          submodule: submoduleName,
          content: mainContent,
          dependencies: dependencyContents,
          metadata: {
            tokenCount: totalTokens,
            loadedSubmodules: submodulesToLoad,
            cacheStatus,
          },
        });
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};

/**
 * Generate packed content for a submodule
 */
async function generateSubmoduleContent(
  rootDir: string,
  submodulePath: string,
  options: {
    compress?: boolean;
    style?: string;
    includePatterns?: string;
    ignorePatterns?: string;
    showLineNumbers?: boolean;
    removeComments?: boolean;
  },
): Promise<{ output: string; fileCount: number; tokenCount: number }> {
  const tempDir = await createToolWorkspace();
  const styleKey = (options.style || 'xml') as keyof typeof defaultFilePathMap;
  const outputFileName = defaultFilePathMap[styleKey];
  const outputFilePath = path.join(tempDir, outputFileName);

  const fullPath = path.join(rootDir, submodulePath);

  const cliOptions: CliOptions = {
    compress: options.compress,
    include: options.includePatterns,
    ignore: options.ignorePatterns,
    output: outputFilePath,
    style: styleKey,
    securityCheck: true,
    quiet: true,
    outputShowLineNumbers: options.showLineNumbers,
    removeComments: options.removeComments,
  };

  const result = await runCli(['.'], fullPath, cliOptions);
  if (!result) {
    throw new Error(`Failed to pack submodule: ${submodulePath}`);
  }

  const { packResult } = result;
  const output = await import('node:fs/promises').then((fs) => fs.readFile(outputFilePath, 'utf-8'));

  return {
    output,
    fileCount: packResult.totalFiles,
    tokenCount: packResult.totalTokens,
  };
}

/**
 * Estimate token count from content length
 * Rough estimate: 4 characters = 1 token
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
