import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, test, vi } from 'vitest';
import { registerGrepRepomixOutputTool } from '../../../src/mcp/tools/grepRepomixOutputTool.js';
import { registerOutputFile } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerReadRepomixOutputTool } from '../../../src/mcp/tools/readRepomixOutputTool.js';

// No fs mock: the outputId resolves (via the real registry) to a host temp path
// that does not exist, so the real fs.access fails and we assert the sandboxed
// error message carries the opaque outputId but never the host path.
const HOST_PATH = '/tmp/repomix/mcp-outputs/xxxxxx/repomix-output.xml';

const captureHandler = (
  register: (s: McpServer, c: { sandboxed: boolean; root: string }) => void,
): ((args: Record<string, unknown>) => Promise<CallToolResult>) => {
  const server = { registerTool: vi.fn().mockReturnThis() } as unknown as McpServer;
  register(server, { sandboxed: true, root: '/allowed/dir' });
  return (server.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];
};

describe('read/grep output tools (sandboxed) omit host temp paths from errors', () => {
  test('read_repomix_output: missing-file error omits the host path', async () => {
    const handler = captureHandler(registerReadRepomixOutputTool);
    registerOutputFile('deadbeef01', HOST_PATH);

    const result = await handler({ outputId: 'deadbeef01' });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).not.toContain('/tmp/repomix');
    expect(text).toContain('deadbeef01');
  });

  test('grep_repomix_output: missing-file error omits the host path', async () => {
    const handler = captureHandler(registerGrepRepomixOutputTool);
    registerOutputFile('deadbeef02', HOST_PATH);

    const result = await handler({ outputId: 'deadbeef02', pattern: 'x' });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).not.toContain('/tmp/repomix');
    expect(text).toContain('deadbeef02');
  });
});
