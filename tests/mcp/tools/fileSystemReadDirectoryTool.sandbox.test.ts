import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadDirectoryTool } from '../../../src/mcp/tools/fileSystemReadDirectoryTool.js';

// No module mocks: the sandboxed branch relies on real fs + realpath.
describe('FileSystemReadDirectoryTool (sandboxed)', () => {
  let root = '';
  let handler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(async () => {
    root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'iso-dir-')));
    await fsp.mkdir(path.join(root, 'src'));
    await fsp.writeFile(path.join(root, 'README.md'), '# hi\n');
    const server = { registerTool: vi.fn().mockReturnThis() } as unknown as McpServer;
    registerFileSystemReadDirectoryTool(server, { sandboxed: true, root });
    handler = (server.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];
  });

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  test('lists the root as "." and returns entry names', async () => {
    const result = await handler({ path: '.' });
    expect(result.structuredContent?.path).toBe('.');
    expect(result.structuredContent?.contents).toEqual(expect.arrayContaining(['[DIR] src', '[FILE] README.md']));
    expect(JSON.stringify(result)).not.toContain(root);
  });

  test('rejects a prefixed path', async () => {
    const result = await handler({ path: '/etc' });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('relative to workspace root');
  });
});
