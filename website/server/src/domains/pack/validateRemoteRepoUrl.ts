import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { AppError } from '../../utils/errorHandler.js';

/**
 * SSRF / LFI hardening for the website server's remote-repo clone path.
 *
 * The public `/api/pack` endpoint clones a user-supplied repository URL with
 * `git clone`. `git-url-parse` (used by `parseRemoteValue`) only validates the
 * `owner/repo` shape, not the protocol or host, so on its own it accepts
 * `file://` (local filesystem read) and `http(s)://` to internal addresses
 * (SSRF against cloud metadata, Docker/internal services). Unlike the CLI, the
 * website only ever needs to clone *public* repositories over HTTPS, so we
 * enforce a strict allowlist here, immediately before the git invocation.
 *
 * See GHSA-mr87-43mh-8c3p (file:// LFI, issue #1704) and
 * GHSA-qv5g-86jf-gc7v (http:// SSRF, issue #1703).
 */

const REJECT_MESSAGE = 'Invalid repository URL. Only public https:// repository URLs are allowed.';

// Injected so tests can drive the DNS-resolution branch deterministically.
type LookupAllFn = (hostname: string, options: { all: true }) => Promise<Array<{ address: string; family: number }>>;

export interface ValidateUrlDeps {
  lookup: LookupAllFn;
}

const defaultDeps: ValidateUrlDeps = {
  lookup: (hostname, options) => dnsLookup(hostname, options),
};

const ipv4ToInt = (ip: string): number => ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0) >>> 0;

// Private, loopback, link-local, and IANA special-purpose IPv4 ranges that must
// never be reachable from the pack endpoint.
const BLOCKED_V4_CIDRS: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this" network / unspecified
  ['10.0.0.0', 8], // RFC 1918 private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (incl. 169.254.169.254 cloud metadata)
  ['172.16.0.0', 12], // RFC 1918 private (incl. Docker default bridge)
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // RFC 1918 private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
  ['255.255.255.255', 32], // broadcast
];

const inCidrV4 = (ipInt: number, base: string, bits: number): boolean => {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (ipv4ToInt(base) & mask);
};

const isBlockedIpv4 = (ip: string): boolean => {
  const ipInt = ipv4ToInt(ip);
  return BLOCKED_V4_CIDRS.some(([base, bits]) => inCidrV4(ipInt, base, bits));
};

const isBlockedIpv6 = (raw: string): boolean => {
  // Strip an optional zone id (e.g. fe80::1%eth0) before matching.
  const ip = raw.toLowerCase().split('%')[0];

  if (ip === '::' || ip === '::1') {
    return true; // unspecified / loopback
  }

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) addresses
  // tunnel an IPv4 target, so validate the embedded IPv4.
  const mapped = ip.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) {
    return isBlockedIpv4(mapped[1]);
  }

  const firstHextet = ip.split(':')[0];
  if (firstHextet.startsWith('fc') || firstHextet.startsWith('fd')) {
    return true; // unique local address fc00::/7
  }
  if (/^fe[89ab]/.test(firstHextet)) {
    return true; // link-local fe80::/10
  }
  if (firstHextet.startsWith('ff')) {
    return true; // multicast ff00::/8
  }
  return false;
};

/**
 * Returns true if the given IP literal points at a private, loopback,
 * link-local, or otherwise reserved address that the server must not clone.
 */
export const isBlockedIpAddress = (ip: string): boolean => {
  const family = isIP(ip);
  if (family === 4) {
    return isBlockedIpv4(ip);
  }
  if (family === 6) {
    return isBlockedIpv6(ip);
  }
  return false;
};

const isBlockedHostname = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/\.$/, ''); // drop trailing FQDN dot
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal')
  );
};

/**
 * Rejects any repository URL that is not a public https:// URL.
 *
 * @throws {AppError} 400 for non-https protocols, or hosts resolving to
 *   private/reserved addresses.
 */
export const assertPublicHttpsRepoUrl = async (repoUrl: string, deps: ValidateUrlDeps = defaultDeps): Promise<void> => {
  let url: URL;
  try {
    url = new URL(repoUrl);
  } catch {
    // Non-URL forms reach here (e.g. SSH `git@host:owner/repo`). The website
    // only clones public HTTPS repos, so anything unparsable is rejected.
    throw new AppError(REJECT_MESSAGE, 400);
  }

  // Blocks file:// (LFI), http://, ssh://, git://, ftp:// (SSRF).
  if (url.protocol !== 'https:') {
    throw new AppError(REJECT_MESSAGE, 400);
  }

  // `url.hostname` keeps brackets around IPv6 literals; strip them for matching.
  const hostname = url.hostname.replace(/^\[/, '').replace(/\]$/, '');

  if (isBlockedHostname(hostname)) {
    throw new AppError(REJECT_MESSAGE, 400);
  }

  if (isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new AppError(REJECT_MESSAGE, 400);
    }
    return;
  }

  // For DNS names, resolve and reject if the target points at a private or
  // reserved address. This catches metadata hostname aliases, DNS rebinding to
  // internal ranges, and decimal/octal IP obfuscation the resolver expands.
  // A lookup failure is not treated as blocked: an unresolvable host simply
  // won't clone, so there is no SSRF value, and we avoid rejecting legitimate
  // repositories on transient DNS errors. (A rebind after this check but before
  // git resolves is a residual TOCTOU risk; the protocol allowlist and literal
  // checks above remain the primary defense.)
  try {
    const addresses = await deps.lookup(hostname, { all: true });
    if (addresses.some(({ address }) => isBlockedIpAddress(address))) {
      throw new AppError(REJECT_MESSAGE, 400);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    // DNS resolution failed — leave it to git clone, which will error out.
  }
};
