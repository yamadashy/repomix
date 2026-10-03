import { describe, expect, test } from 'vitest';
import { buildLandstripPolicy } from '../../../src/mcp/sandbox/landstrip.js';

// buildLandstripPolicy is pure and platform-independent, so its structure is
// verified here on every CI OS. The landstrip binary itself is exercised
// out-of-process by e2e/mcp-sandbox/confinement.test.ts where it is installed.

describe('buildLandstripPolicy', () => {
  test('switches reads to an allowlist (denyRead "/") covering runtime + workspace + writable temp', () => {
    const policy = JSON.parse(buildLandstripPolicy(['/node', '/ws'], ['/tmp/s']));
    expect(policy.filesystem.denyRead).toBe('/');
    const reads = policy.filesystem.allowRead.split('\n');
    expect(reads).toContain('/node');
    expect(reads).toContain('/ws');
    // writable paths must also be readable (reading pack output back)
    expect(reads).toContain('/tmp/s');
  });

  test('only the session temp is writable; the workspace stays read-only', () => {
    const policy = JSON.parse(buildLandstripPolicy(['/node', '/ws'], ['/tmp/s']));
    const writes = policy.filesystem.allowWrite.split('\n');
    expect(writes).toContain('/tmp/s');
    expect(writes).not.toContain('/ws'); // workspace is readable, never writable
    expect(writes).not.toContain('/node');
  });

  test('no network section → landstrip denies outbound network (TCP and UDP) by default', () => {
    const policy = JSON.parse(buildLandstripPolicy(['/node'], ['/tmp/s']));
    expect(policy.network).toBeUndefined();
  });

  test('sets Windows AppContainer to standard mode (LPAC breaks Node Winsock init) without granting network', () => {
    const policy = JSON.parse(buildLandstripPolicy(['/node'], ['/tmp/s']));
    expect(policy.windows.appContainerMode).toBe('standard');
    // standard mode is a system-dir baseline, NOT a network grant — network stays denied
    expect(policy.network).toBeUndefined();
  });
});
