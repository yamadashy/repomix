import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Shared plumbing for the sandbox e2e suites (confinement.test.ts, leakProof.test.ts):
// locating the built server, spawning it over MCP stdio, and reading tool results.

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const bin = path.join(repoRoot, 'bin', 'repomix.cjs');

export const textOf = (r: { content?: { text?: string }[] }): string => r?.content?.[0]?.text ?? '';

export const realpath = (p: string): string => {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
};

export interface Connection {
  client: Client;
  /** pid of the process the MCP client spawned (the sandbox wrapper parent). */
  pid: number | null;
}

export const connect = async (
  ws: string,
  opts: { attempts?: number; env?: Record<string, string>; args?: string[]; nodeArgs?: string[] } = {},
): Promise<Connection> => {
  const attempts = opts.attempts ?? 3;
  for (let i = 1; ; i++) {
    const transport = new StdioClientTransport({
      command: process.execPath,
      // nodeArgs go before the script, so they land in the launcher's execArgv and it
      // forwards them to the confined child (the same path production node flags take).
      args: [...(opts.nodeArgs ?? []), bin, ...(opts.args ?? ['--mcp', '--sandbox-strict'])],
      cwd: ws,
      env: { ...process.env, ...opts.env } as Record<string, string>,
      stderr: 'inherit',
    });
    const client = new Client({ name: 'mcp-sandbox-e2e', version: '0.0.0' });
    try {
      const race = await Promise.race([
        client.connect(transport).then(() => 'ok' as const),
        new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 25000)),
      ]);
      if (race === 'timeout') throw new Error('connect timed out');
      return { client, pid: transport.pid };
    } catch (e) {
      await client.close().catch(() => {});
      if (i >= attempts) throw e;
      // Log every retry so a flapping startup shows up in CI logs instead of being
      // silently absorbed by the retry loop.
      process.stderr.write(`[connect] attempt ${i}/${attempts} failed, retrying: ${e}\n`);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
};
