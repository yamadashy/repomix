import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
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

// Private, loopback, link-local, and IANA special-purpose ranges that must
// never be reachable from the pack endpoint.
//
// `net.BlockList` matches on the parsed address bytes rather than the string,
// so non-canonical spellings collapse onto the same rule: expanded IPv6
// (`0:0:0:0:0:0:0:1`) and IPv4-mapped addresses in either dotted or hex form
// (`::ffff:127.0.0.1` / `::ffff:7f00:1`) all hit the matching entry. Hand-rolled
// string checks miss those forms — and `new URL()` canonicalizes IPv4-mapped
// literals to the hex form, so the bypass is reachable in practice.
const buildBlockedRanges = (): BlockList => {
  const list = new BlockList();

  // IPv4
  list.addSubnet('0.0.0.0', 8, 'ipv4'); // "this" network / unspecified
  list.addSubnet('10.0.0.0', 8, 'ipv4'); // RFC 1918 private
  list.addSubnet('100.64.0.0', 10, 'ipv4'); // CGNAT
  list.addSubnet('127.0.0.0', 8, 'ipv4'); // loopback
  list.addSubnet('169.254.0.0', 16, 'ipv4'); // link-local (incl. 169.254.169.254 cloud metadata)
  list.addSubnet('172.16.0.0', 12, 'ipv4'); // RFC 1918 private (incl. Docker default bridge)
  list.addSubnet('192.0.0.0', 24, 'ipv4'); // IETF protocol assignments
  list.addSubnet('192.0.2.0', 24, 'ipv4'); // TEST-NET-1
  list.addSubnet('192.168.0.0', 16, 'ipv4'); // RFC 1918 private
  list.addSubnet('198.18.0.0', 15, 'ipv4'); // benchmarking
  list.addSubnet('198.51.100.0', 24, 'ipv4'); // TEST-NET-2
  list.addSubnet('203.0.113.0', 24, 'ipv4'); // TEST-NET-3
  list.addSubnet('224.0.0.0', 4, 'ipv4'); // multicast
  list.addSubnet('240.0.0.0', 4, 'ipv4'); // reserved
  list.addAddress('255.255.255.255', 'ipv4'); // broadcast

  // IPv6
  list.addAddress('::', 'ipv6'); // unspecified
  list.addAddress('::1', 'ipv6'); // loopback
  list.addSubnet('fc00::', 7, 'ipv6'); // unique local address
  list.addSubnet('fe80::', 10, 'ipv6'); // link-local
  list.addSubnet('fec0::', 10, 'ipv6'); // site-local (deprecated but still resolvable)
  list.addSubnet('ff00::', 8, 'ipv6'); // multicast

  return list;
};

const blockedRanges = buildBlockedRanges();

/**
 * Returns true if the given IP literal points at a private, loopback,
 * link-local, or otherwise reserved address that the server must not clone.
 */
export const isBlockedIpAddress = (ip: string): boolean => {
  const family = isIP(ip);
  if (family === 4) {
    return blockedRanges.check(ip, 'ipv4');
  }
  if (family === 6) {
    // BlockList maps IPv4-mapped IPv6 addresses onto the IPv4 rules above.
    return blockedRanges.check(ip, 'ipv6');
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
