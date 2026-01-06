import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { MonorepoConfig, SubmoduleConfig } from '../config/monorepoConfigLoader.js';
import { MONOREPO_CONFIG_FILE, saveMonorepoConfig } from '../config/monorepoConfigLoader.js';
import { ProjectDetector } from '../detection/projectDetector.js';
import { generateCacheScript, JustfileGenerator } from '../generation/justfileGenerator.js';
import { buildMcpToolErrorResponse, buildMcpToolSuccessResponse, convertErrorToJson } from './mcpToolRuntime.js';

const initMonorepoConfigInputSchema = z.object({
  projectRoot: z.string().optional().describe('Project root directory (defaults to current working directory)'),
  detectGitSubmodules: z.boolean().default(true).describe('Detect and mark git submodules'),
  generateJustfile: z.boolean().default(true).describe('Generate justfile for cache management'),
  generateScript: z.boolean().default(true).describe('Generate cache management script'),
  cacheDirectory: z.string().default('.repomix-cache').describe('Cache directory path'),
  compress: z.boolean().default(true).describe('Enable compression by default'),
  style: z.enum(['xml', 'markdown', 'json', 'plain']).default('xml').describe('Default output format'),
});

const initMonorepoConfigOutputSchema = z.object({
  projectType: z.string().describe('Detected project type (rust, typescript, python, go, mixed, generic)'),
  submodules: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      type: z.string(),
      isGitSubmodule: z.boolean(),
    }),
  ),
  configPath: z.string().describe('Path to generated configuration file'),
  justfilePath: z.string().optional().describe('Path to generated justfile (if requested)'),
  scriptPath: z.string().optional().describe('Path to generated script (if requested)'),
  message: z.string().describe('Human-readable summary'),
});

/**
 * Register the init_monorepo_config MCP tool
 */
export const registerInitMonorepoConfigTool = (mcpServer: McpServer): void => {
  mcpServer.registerTool(
    'init_monorepo_config',
    {
      title: 'Initialize Monorepo Configuration',
      description:
        'Automatically detect project structure and generate .repomix-monorepo.json configuration. Supports Rust workspaces, npm/pnpm/yarn workspaces, Go workspaces, and Python monorepos. Optionally generates justfile and cache management scripts.',
      inputSchema: initMonorepoConfigInputSchema,
      outputSchema: initMonorepoConfigOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({
      projectRoot,
      detectGitSubmodules,
      generateJustfile,
      generateScript,
      cacheDirectory,
      compress,
      style,
    }): Promise<CallToolResult> => {
      try {
        const rootDir = projectRoot || process.cwd();

        // 1. Detect project structure
        const detector = new ProjectDetector(rootDir);
        const detection = await detector.detect();

        if (detection.submodules.length === 0) {
          return buildMcpToolErrorResponse({
            errorMessage:
              'No submodules detected. This tool works best with Rust workspaces, npm/pnpm workspaces, Go workspaces, or projects with standard directory structures (packages/, crates/, libs/, apps/, etc.).',
          });
        }

        // 2. Build configuration
        const submodules: Record<string, SubmoduleConfig> = {};
        for (const sub of detection.submodules) {
          submodules[sub.name] = {
            path: sub.path,
            description: sub.description,
            dependencies: sub.dependencies,
            isGitSubmodule: detectGitSubmodules ? sub.isGitSubmodule : false,
          };
        }

        const config: MonorepoConfig = {
          submodules,
          cache: {
            directory: cacheDirectory,
            enabled: true,
          },
          repomix: {
            compress,
            style,
            removeComments: false,
            showLineNumbers: true,
          },
        };

        // 3. Save configuration file
        await saveMonorepoConfig(config, rootDir);
        const configPath = path.join(rootDir, MONOREPO_CONFIG_FILE);

        // 4. Generate justfile (if requested)
        let justfilePath: string | undefined;
        if (generateJustfile) {
          const generator = new JustfileGenerator(config, detection.submodules, {
            cacheDir: cacheDirectory,
            scriptDir: 'scripts',
          });
          const justfileContent = generator.generate();

          // Check if justfile already exists
          const justfileFullPath = path.join(rootDir, 'justfile');
          let existingContent = '';
          try {
            existingContent = await fs.readFile(justfileFullPath, 'utf-8');
          } catch {
            // File doesn't exist
          }

          if (existingContent) {
            // Append to existing justfile if repomix section doesn't exist
            if (!existingContent.includes('# Repomix Monorepo Cache Management')) {
              await fs.writeFile(justfileFullPath, `${existingContent}\n\n${justfileContent}`, 'utf-8');
              justfilePath = justfileFullPath;
            }
          } else {
            await fs.writeFile(justfileFullPath, justfileContent, 'utf-8');
            justfilePath = justfileFullPath;
          }
        }

        // 5. Generate cache script (if requested)
        let scriptPath: string | undefined;
        if (generateScript) {
          const scriptsDir = path.join(rootDir, 'scripts');
          await fs.mkdir(scriptsDir, { recursive: true });

          const scriptContent = generateCacheScript();
          scriptPath = path.join(scriptsDir, 'repomix-cache.mjs');
          await fs.writeFile(scriptPath, scriptContent, 'utf-8');
        }

        // 6. Update .gitignore to exclude cache directory
        await updateGitignore(rootDir, cacheDirectory);

        // 7. Build response
        const submoduleList = detection.submodules.map((sub) => ({
          name: sub.name,
          path: sub.path,
          type: sub.type,
          isGitSubmodule: sub.isGitSubmodule,
        }));

        const gitSubmoduleCount = submoduleList.filter((s) => s.isGitSubmodule).length;
        let message = `Detected ${detection.projectType} project with ${submoduleList.length} submodule(s)`;
        if (gitSubmoduleCount > 0) {
          message += ` (${gitSubmoduleCount} git submodule(s))`;
        }
        message += `. Configuration saved to ${MONOREPO_CONFIG_FILE}.`;
        if (justfilePath) {
          message += ' Justfile updated.';
        }
        if (scriptPath) {
          message += ' Cache script generated.';
        }

        return buildMcpToolSuccessResponse({
          projectType: detection.projectType,
          submodules: submoduleList,
          configPath,
          justfilePath,
          scriptPath,
          message,
        });
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};

/**
 * Update .gitignore to exclude cache directory
 */
async function updateGitignore(rootDir: string, cacheDirectory: string): Promise<void> {
  const gitignorePath = path.join(rootDir, '.gitignore');
  let content = '';

  try {
    content = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // File doesn't exist, will create
  }

  // Check if cache directory is already in .gitignore
  const cachePattern = cacheDirectory.startsWith('/') ? cacheDirectory : `/${cacheDirectory}`;
  if (!content.includes(cacheDirectory) && !content.includes(cachePattern)) {
    const addition = `\n# Repomix monorepo cache\n${cachePattern}/\n`;
    await fs.writeFile(gitignorePath, content + addition, 'utf-8');
  }
}
