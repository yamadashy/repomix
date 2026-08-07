import crypto from 'node:crypto';

/**
 * Environment contract between the kernel-sandbox launcher (src/mcp/sandbox) and the
 * confined server process. Lives in `src/shared` so core readers need no dependency
 * on `mcp/sandbox`. Two variables with two distinct jobs:
 *
 * - REPOMIX_SANDBOXED — behavioral MARKER, read by pack internals to adapt (inline
 *   workers, skip git spawns). Spoofable by design; a stray "1" only degrades
 *   functionality, never confinement.
 * - REPOMIX_SANDBOX_TOKEN — confinement PROOF: a per-invocation random token the
 *   launcher sets only on the child it actually confined. Anything that WEAKENS a
 *   guard (serving as the already-confined child, the confined realpath fail-open)
 *   must gate on this, never on the marker, so a stray inherited "1" cannot disable
 *   confinement. This is a format check, not an authenticated binding — it does not
 *   stop someone who deliberately plants a well-formed token, which is out of scope
 *   since only the trusted operator sets the launch env. Unspoofable hardening if
 *   this graduates: probe a known-denied read on entry instead of trusting the env.
 */
export const SANDBOXED_ENV = 'REPOMIX_SANDBOXED';

/** True when running inside the sandboxed MCP server's confined process. */
export const isSandboxedProcess = (): boolean => process.env[SANDBOXED_ENV] === '1';

export const SANDBOX_TOKEN_ENV = 'REPOMIX_SANDBOX_TOKEN';

/** Generate a fresh confinement token (128 bits of entropy, lowercase hex). */
export const makeSandboxToken = (): string => crypto.randomBytes(16).toString('hex');

/** True only for a well-formed confinement token (our own format), never for "1". */
export const isSandboxToken = (value: string | undefined): boolean => !!value && /^[0-9a-f]{32}$/.test(value);

/** True when a kernel sandbox launcher provably confined this process (see above). */
export const isKernelConfinedProcess = (): boolean => isSandboxToken(process.env[SANDBOX_TOKEN_ENV]);
