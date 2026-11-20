import fsp from 'node:fs/promises';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test } from 'vitest';
import { registerFileSystemReadFileTool } from '../../../src/mcp/tools/fileSystemReadFileTool.js';
import { createMcpServerDouble } from '../../testing/mcpServerDoubles.js';
import { createTempDir } from '../../testing/tempDir.js';
import { structuredContentOf } from '../../testing/testUtils.js';

// No module mocks here: the sandboxed branch relies on real fs + realpath so
// resolveWithinRoot's containment checks exercise the actual filesystem.
describe('FileSystemReadFileTool (sandboxed)', () => {
  let root = '';
  let handler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(async () => {
    root = await createTempDir('iso-read-', { realpath: true });
    await fsp.writeFile(path.join(root, 'a.ts'), 'const x = 1;\n');
    const server = createMcpServerDouble();
    registerFileSystemReadFileTool(server.server, { sandboxed: true, root });
    handler = server.toolHandler();
  });

  test('reads a plain-relative file and echoes a plain-relative path', async () => {
    const result = await handler({ path: 'a.ts' });
    expect(structuredContentOf(result).path).toBe('a.ts');
    expect(structuredContentOf(result).content).toBe('const x = 1;\n');
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
