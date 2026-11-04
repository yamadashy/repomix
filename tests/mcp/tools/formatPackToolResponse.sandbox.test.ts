import fsp from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { formatPackToolResponse, type McpToolMetrics } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { createTempDir } from '../../testing/tempDir.js';

// Real modules (no path/fs mocks): exercises the sandbox virtualization branch of
// formatPackToolResponse end to end — the host output path and the absolute
// directory must never appear in the response when sandboxed.

const metrics = (): McpToolMetrics => ({
  totalFiles: 1,
  totalCharacters: 10,
  totalTokens: 3,
  fileCharCounts: { 'src/a.ts': 10 },
  fileTokenCounts: { 'src/a.ts': 3 },
  processedFiles: [],
  safeFilePaths: ['src/a.ts'],
});

const structured = (r: { structuredContent?: unknown }): Record<string, unknown> =>
  r.structuredContent as Record<string, unknown>;
const descOf = (r: { structuredContent?: unknown }): string => String(structured(r).description ?? '');

describe('formatPackToolResponse virtualization', () => {
  let root = '';
  let outputFilePath = '';

  beforeEach(async () => {
    root = await createTempDir('fmt-scope-', { realpath: true });
    outputFilePath = path.join(root, 'repomix-output.xml');
    await fsp.writeFile(outputFilePath, 'line1\nline2\n');
  });

  test('sandboxed: blanks the host output path and virtualizes the directory', async () => {
    const directory = path.join(root, 'src');
    const result = await formatPackToolResponse({ directory }, metrics(), outputFilePath, 10, false, {
      sandboxed: true,
      root,
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(root); // no host path anywhere
    expect(structured(result).outputFilePath).toBe('');

    const parsed = JSON.parse(structured(result).result as string);
    expect(parsed.directory).toBe('src'); // virtualized, not the absolute path
    expect(parsed.outputFilePath).toBe('');

    // the only line that echoes the host output path is dropped in sandbox mode
    expect(descOf(result)).not.toContain('read the file directly using path');
  });

  test('non-sandboxed: keeps the real output path and the direct-access hint', async () => {
    const directory = path.join(root, 'src');
    const result = await formatPackToolResponse({ directory }, metrics(), outputFilePath, 10, false);

    expect(structured(result).outputFilePath).toBe(outputFilePath);
    const parsed = JSON.parse(structured(result).result as string);
    expect(parsed.directory).toBe(directory); // absolute path preserved
    expect(parsed.outputFilePath).toBe(outputFilePath);
    expect(descOf(result)).toContain('read the file directly using path');
  });
});
