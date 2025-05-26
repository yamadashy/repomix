/**
 * MCP controller for handling Model Context Protocol server
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { PackRemoteRepositoryUseCase } from '../../application/usecases/PackRemoteRepositoryUseCase.js';
import type { PackRepositoryUseCase } from '../../application/usecases/PackRepositoryUseCase.js';
import type { RepomixConfigMerged } from '../../shared/config/configSchema.js';
import { logger } from '../../shared/logger.js';

export class McpController {
  private server: McpServer;

  constructor(
    private readonly packRepositoryUseCase: PackRepositoryUseCase,
    private readonly packRemoteRepositoryUseCase: PackRemoteRepositoryUseCase,
    private readonly config: RepomixConfigMerged,
    private readonly version: string,
  ) {
    this.server = new McpServer({
      name: 'repomix-mcp-server',
      version: this.version,
    });
  }

  /**
   * Register all tools and prompts
   */
  async registerTools(): Promise<void> {
    this.registerPackCodebaseTool();
    this.registerPackRemoteRepositoryTool();
    this.registerReadRepomixOutputTool();
    this.registerFileSystemReadFileTool();
    this.registerFileSystemReadDirectoryTool();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();

    const handleExit = async () => {
      try {
        await this.server.close();
        logger.trace('Repomix MCP Server shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during MCP server shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    try {
      await this.server.connect(transport);
      logger.trace('Repomix MCP Server running on stdio');
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }

  /**
   * Register pack codebase tool
   */
  private registerPackCodebaseTool(): void {
    this.server.tool(
      'pack_codebase',
      'Pack a local codebase into a single file',
      {
        rootDirs: z.array(z.string()).describe('Root directories to pack'),
        outputStyle: z.enum(['xml', 'markdown', 'plain']).optional().default('xml').describe('Output style'),
        includeSummary: z.boolean().optional().default(true).describe('Include file summary'),
        includeDirectoryStructure: z.boolean().optional().default(true).describe('Include directory structure'),
        includeFiles: z.boolean().optional().default(true).describe('Include file contents'),
        removeComments: z.boolean().optional().default(false).describe('Remove comments'),
        removeEmptyLines: z.boolean().optional().default(false).describe('Remove empty lines'),
        compress: z.boolean().optional().default(false).describe('Compress output'),
        includeGitDiffs: z.boolean().optional().default(false).describe('Include git diffs'),
      },
      {
        title: 'Pack Codebase',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      async (args, extra) => {
        try {
          const packageOptions = {
            outputStyle: args.outputStyle || 'xml',
            includeSummary: args.includeSummary !== false,
            includeDirectoryStructure: args.includeDirectoryStructure !== false,
            includeFiles: args.includeFiles !== false,
            removeComments: args.removeComments || false,
            removeEmptyLines: args.removeEmptyLines || false,
            compress: args.compress || false,
            includeGitDiffs: args.includeGitDiffs || false,
          };

          const result = await this.packRepositoryUseCase.execute(args.rootDirs, packageOptions, (message) =>
            logger.info(message),
          );

          return {
            output: result.output,
            totalFiles: result.totalFiles,
            totalCharacters: result.totalCharacters,
            totalTokens: result.totalTokens,
          };
        } catch (error) {
          logger.error('Error in pack_codebase tool:', error);
          throw error;
        }
      },
    );
  }

  /**
   * Register pack remote repository tool
   */
  private registerPackRemoteRepositoryTool(): void {
    this.server.tool(
      'pack_remote_repository',
      'Pack a remote repository into a single file',
      {
        remoteUrl: z.string().describe('Remote repository URL'),
        branch: z.string().optional().describe('Branch to pack'),
        outputStyle: z.enum(['xml', 'markdown', 'plain']).optional().default('xml').describe('Output style'),
        includeSummary: z.boolean().optional().default(true).describe('Include file summary'),
        includeDirectoryStructure: z.boolean().optional().default(true).describe('Include directory structure'),
        includeFiles: z.boolean().optional().default(true).describe('Include file contents'),
        removeComments: z.boolean().optional().default(false).describe('Remove comments'),
        removeEmptyLines: z.boolean().optional().default(false).describe('Remove empty lines'),
        compress: z.boolean().optional().default(false).describe('Compress output'),
      },
      {
        title: 'Pack Remote Repository',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      async (args, extra) => {
        try {
          const packageOptions = {
            outputStyle: args.outputStyle || 'xml',
            includeSummary: args.includeSummary !== false,
            includeDirectoryStructure: args.includeDirectoryStructure !== false,
            includeFiles: args.includeFiles !== false,
            removeComments: args.removeComments || false,
            removeEmptyLines: args.removeEmptyLines || false,
            compress: args.compress || false,
            includeGitDiffs: false,
          };

          const result = await this.packRemoteRepositoryUseCase.execute(
            args.remoteUrl,
            args.branch,
            packageOptions,
            (message) => logger.info(message),
          );

          return {
            output: result.output,
            totalFiles: result.totalFiles,
            totalCharacters: result.totalCharacters,
            totalTokens: result.totalTokens,
          };
        } catch (error) {
          logger.error('Error in pack_remote_repository tool:', error);
          throw error;
        }
      },
    );
  }

  /**
   * Register read repomix output tool
   */
  private registerReadRepomixOutputTool(): void {
    this.server.tool(
      'read_repomix_output',
      'Read the output of a previous repomix run',
      {
        filePath: z.string().describe('Path to the repomix output file'),
      },
      {
        title: 'Read Repomix Output',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      async (args, extra) => {
        return { content: [{ text: '' }] };
      },
    );
  }

  /**
   * Register file system read file tool
   */
  private registerFileSystemReadFileTool(): void {
    this.server.tool(
      'file_system_read_file',
      'Read a file from the file system',
      {
        filePath: z.string().describe('Path to the file to read'),
      },
      {
        title: 'Read File',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      async (args, extra) => {
        return { content: [{ text: '' }] };
      },
    );
  }

  /**
   * Register file system read directory tool
   */
  private registerFileSystemReadDirectoryTool(): void {
    this.server.tool(
      'file_system_read_directory',
      'Read a directory from the file system',
      {
        dirPath: z.string().describe('Path to the directory to read'),
      },
      {
        title: 'Read Directory',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      async (args, extra) => {
        return { content: [{ text: '' }] };
      },
    );
  }
}
