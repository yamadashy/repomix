import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {logger, repomixLogLevels, setLogLevel} from "../../shared/logger.js";
import {getVersion} from "../file/packageJsonParse.js";
import {runDefaultAction} from "../../cli/actions/defaultAction.js";
import {CliOptions} from "../../cli/types.js";
import fs from "node:fs/promises";

export const createMcpServer = async () => {
  const mcpServer = new McpServer({
    name: "repomix",
    version: await getVersion(),
  });

  mcpServer.tool(
    "repomix-pack",
    "Pack repository content into a single file",
    {
      targetDirectory: z.string().describe("Target directory to pack"),
      outputFormat: z.enum(["plain", "xml", "markdown"]).optional().describe("Output format"),
      includePatterns: z.array(z.string()).optional().describe("Patterns to include"),
      ignorePatterns: z.array(z.string()).optional().describe("Patterns to ignore"),
      outputPath: z.string().optional().describe("Custom output file path"),
    },
    async ({ targetDirectory, outputFormat, includePatterns, ignorePatterns, outputPath }) => {
      try {
        const cliOptions = {
          style: outputFormat,
          securityCheck: false,
          topFilesLen: 10,
          include: includePatterns,
          ignore: ignorePatterns,
          quiet: true,
        } as CliOptions;

        setLogLevel(repomixLogLevels.SILENT);

        const result = await runDefaultAction(['.'], targetDirectory, cliOptions);

        const outputPath = result.config.output.filePath;
        const content = await fs.readFile(outputPath, 'utf-8');

        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      } catch (error) {
        console.log(error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error packing repository: ${error instanceof Error ? error.message +'. '+ error.stack : String(error)}`,
            },
          ],
        };
      }
    },
  );

  return mcpServer;
};

export const runMcpServer = async () => {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();

  const handleExit = async () => {
    try {
      await server.close();
      logger.trace("Repomix MCP Server shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error("Error during MCP server shutdown:", error);
      process.exit(1);
    }
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);

  try {
    await server.connect(transport);
    logger.trace("Repomix MCP Server running on stdio");
  } catch (error) {
    logger.error("Failed to start MCP server:", error);
    process.exit(1);
  }
};
