import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadFileTool } from '../../../src/mcp/tools/fileSystemReadFileTool.js';

// No module mocks here: the sandboxed branch relies on real fs + realpath so
// resolveWithinRoot's containment checks exercise the actual filesystem.
describe('FileSystemReadFileTool (sandboxed)', () => {
  let root = '';
  let handler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(async () => {
    root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'iso-read-')));
    await fsp.writeFile(path.join(root, 'a.ts'), 'const x = 1;\n');
    const server = { registerTool: vi.fn().mockReturnThis() } as unknown as McpServer;
    registerFileSystemReadFileTool(server, { sandboxed: true, root });
    handler = (server.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];
  });

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  test('reads a plain-relative file and echoes a plain-relative path', async () => {
    const result = await handler({ path: 'a.ts' });
    expect(result.structuredContent?.path).toBe('a.ts');
    expect(result.structuredContent?.content).toBe('const x = 1;\n');
    expect(JSON.stringify(result)).not.toContain(root);
  });

  test('rejects a prefixed/escaping path', async () => {
    const result = await handler({ path: '../../etc/passwd' });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('relative to workspace root');
    expect((result.content[0] as { text: string }).text).not.toContain(root);
  });

  test('rejects a leading-slash path', async () => {
    const result = await handler({ path: '/etc/passwd' });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('relative to workspace root');
  });
});
