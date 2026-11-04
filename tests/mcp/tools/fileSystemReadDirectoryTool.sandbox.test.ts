import fsp from 'node:fs/promises';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test } from 'vitest';
import { registerFileSystemReadDirectoryTool } from '../../../src/mcp/tools/fileSystemReadDirectoryTool.js';
import { createMcpServerDouble } from '../../testing/mcpServerDoubles.js';
import { createTempDir } from '../../testing/tempDir.js';
import { structuredContentOf } from '../../testing/testUtils.js';

// No module mocks: the sandboxed branch relies on real fs + realpath.
describe('FileSystemReadDirectoryTool (sandboxed)', () => {
  let root = '';
  let handler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(async () => {
    root = await createTempDir('iso-dir-', { realpath: true });
    await fsp.mkdir(path.join(root, 'src'));
    await fsp.writeFile(path.join(root, 'README.md'), '# hi\n');
    const server = createMcpServerDouble();
    registerFileSystemReadDirectoryTool(server.server, { sandboxed: true, root });
    handler = server.toolHandler();
  });

  test('lists the root as "." and returns entry names', async () => {
    const result = await handler({ path: '.' });
    expect(structuredContentOf(result).path).toBe('.');
    expect(structuredContentOf(result).contents).toEqual(expect.arrayContaining(['[DIR] src', '[FILE] README.md']));
    expect(JSON.stringify(result)).not.toContain(root);
  });

  test('rejects a prefixed path', async () => {
    const result = await handler({ path: '/etc' });
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('relative to workspace root');
  });
});
