/**
 * Behavioral marker set on the confined MCP server process, read by pack internals to
 * adapt (inline workers, skip git spawns). Lives in `src/shared` so core readers need
 * no dependency on `mcp/sandbox`.
 *
 * NOT the confinement proof — a stray inherited "1" must never disable confinement.
 * That decision uses REPOMIX_SANDBOX_TOKEN in `src/mcp/sandbox/shared.ts`.
 */
export const SANDBOXED_ENV = 'REPOMIX_SANDBOXED';

/** True when running inside the sandboxed MCP server's confined process. */
export const isSandboxedProcess = (): boolean => process.env[SANDBOXED_ENV] === '1';
