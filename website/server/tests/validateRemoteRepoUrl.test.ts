import { describe, expect, test, vi } from 'vitest';
import {
  assertPublicHttpsRepoUrl,
  isBlockedIpAddress,
  type ValidateUrlDeps,
} from '../src/domains/pack/validateRemoteRepoUrl.js';
import { AppError } from '../src/utils/errorHandler.js';

// A lookup stub that resolves every hostname to a fixed set of addresses.
const stubLookup = (addresses: Array<{ address: string; family: number }>): ValidateUrlDeps['lookup'] =>
  vi.fn(async () => addresses);

// Public IP so the DNS-resolution branch passes for legitimate hosts.
const publicDeps: ValidateUrlDeps = { lookup: stubLookup([{ address: '140.82.121.3', family: 4 }]) };

describe('isBlockedIpAddress', () => {
  test.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254', // GCP/AWS metadata
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '198.18.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'fec0::1', // site-local (deprecated)
    '::ffff:127.0.0.1', // IPv4-mapped loopback (dotted)
    '::ffff:169.254.169.254',
    '::ffff:7f00:1', // IPv4-mapped loopback (hex form new URL normalizes to)
    '::ffff:a9fe:a9fe', // IPv4-mapped metadata (hex form)
    '0:0:0:0:0:0:0:1', // fully expanded loopback
  ])('blocks reserved address %s', (ip) => {
    expect(isBlockedIpAddress(ip)).toBe(true);
  });

  test.each([
    '8.8.8.8',
    '140.82.121.3', // github.com
    '1.1.1.1',
    '2606:4700:4700::1111', // public IPv6 (Cloudflare)
    '::ffff:8.8.8.8', // IPv4-mapped public
    '172.15.0.1', // just below the 172.16/12 private block
    '172.32.0.1', // just above the 172.16/12 private block
  ])('allows public address %s', (ip) => {
    expect(isBlockedIpAddress(ip)).toBe(false);
  });

  test('returns false for non-IP strings', () => {
    expect(isBlockedIpAddress('github.com')).toBe(false);
  });
});

describe('assertPublicHttpsRepoUrl', () => {
  const expectRejected = async (url: string, deps: ValidateUrlDeps = publicDeps) => {
    await expect(assertPublicHttpsRepoUrl(url, deps)).rejects.toBeInstanceOf(AppError);
    await expect(assertPublicHttpsRepoUrl(url, deps)).rejects.toMatchObject({ statusCode: 400 });
  };

  test('accepts a public https repository URL', async () => {
    await expect(assertPublicHttpsRepoUrl('https://github.com/owner/repo.git', publicDeps)).resolves.toBeUndefined();
  });

  test('rejects file:// URLs (LFI, issue #1704)', async () => {
    await expectRejected('file:///etc/passwd');
    await expectRejected('file:///tmp/test-lfi-repo');
  });

  test('rejects http:// URLs (SSRF, issue #1703)', async () => {
    await expectRejected('http://172.18.0.1:9999/user/repo.git');
    await expectRejected('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token');
  });

  test('rejects non-http(s) protocols', async () => {
    await expectRejected('ssh://git@github.com/owner/repo.git');
    await expectRejected('git://github.com/owner/repo.git');
    await expectRejected('ftp://example.com/repo.git');
  });

  test('rejects SSH scp-like syntax that is not a parseable URL', async () => {
    await expectRejected('git@github.com:owner/repo.git');
  });

  test('rejects https to loopback / private IP literals', async () => {
    await expectRejected('https://127.0.0.1/owner/repo.git');
    await expectRejected('https://169.254.169.254/latest/meta-data');
    await expectRejected('https://10.0.0.5/owner/repo.git');
    await expectRejected('https://[::1]/owner/repo.git');
  });

  test('rejects IPv4-mapped IPv6 literals that new URL normalizes to hex', async () => {
    // new URL('https://[::ffff:127.0.0.1]/…') canonicalizes the host to
    // [::ffff:7f00:1]; byte-level matching must still catch the loopback.
    await expectRejected('https://[::ffff:127.0.0.1]/owner/repo.git');
    await expectRejected('https://[::ffff:169.254.169.254]/owner/repo.git');
  });

  test('rejects blocked hostnames without needing DNS', async () => {
    // lookup that would throw if called — proves these are blocked by name.
    const throwingDeps: ValidateUrlDeps = {
      lookup: vi.fn(async () => {
        throw new Error('lookup should not be called');
      }),
    };
    await expectRejected('https://localhost/owner/repo.git', throwingDeps);
    await expectRejected('https://metadata.google.internal/owner/repo.git', throwingDeps);
    await expectRejected('https://foo.internal/owner/repo.git', throwingDeps);
  });

  test('rejects a public hostname that resolves to a private address (DNS rebinding / obfuscation)', async () => {
    const rebindDeps: ValidateUrlDeps = { lookup: stubLookup([{ address: '10.0.0.1', family: 4 }]) };
    await expectRejected('https://evil.example.com/owner/repo.git', rebindDeps);
  });

  test('rejects blocked hostnames case-insensitively and with a trailing FQDN dot', async () => {
    const throwingDeps: ValidateUrlDeps = {
      lookup: vi.fn(async () => {
        throw new Error('lookup should not be called');
      }),
    };
    await expectRejected('https://LOCALHOST/owner/repo.git', throwingDeps);
    // A trailing dot denotes an absolute FQDN and must resolve identically to
    // the bare hostname — `new URL()` preserves it verbatim on `.hostname`.
    await expectRejected('https://localhost./owner/repo.git', throwingDeps);
    await expectRejected('https://METADATA.GOOGLE.INTERNAL/owner/repo.git', throwingDeps);
  });

  test('does not over-block hostnames that merely contain a blocked label as a substring', async () => {
    // `.internal` / `localhost` matching is suffix-based (a real label
    // boundary), not a substring check — a hostname like
    // `my-internal-service.example.com` must not be blocked just because it
    // contains "internal", since its actual (rightmost) label is `.com`.
    await expect(
      assertPublicHttpsRepoUrl('https://my-internal-service.example.com/owner/repo.git', publicDeps),
    ).resolves.toBeUndefined();
    await expect(
      assertPublicHttpsRepoUrl('https://notlocalhost.example.com/owner/repo.git', publicDeps),
    ).resolves.toBeUndefined();
  });

  test('does not block when DNS resolution fails (availability over false rejection)', async () => {
    const failingDeps: ValidateUrlDeps = {
      lookup: vi.fn(async () => {
        throw new Error('ENOTFOUND');
      }),
    };
    await expect(
      assertPublicHttpsRepoUrl('https://does-not-resolve.example.com/owner/repo.git', failingDeps),
    ).resolves.toBeUndefined();
  });
});
