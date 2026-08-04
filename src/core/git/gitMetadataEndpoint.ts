import { RepomixError } from '../../shared/errorHandle.js';

// Cloud instance metadata endpoints. These serve credentials to anything that can
// reach them, and they host no git repository, so refusing to clone from them costs
// nothing.
//
// The reason to check at all is that the caller is not always the user. Through the
// MCP server an AI agent chooses the URL, and an agent reading an attacker-controlled
// repository can be talked into cloning an address the user never asked for. "You
// could have run curl yourself" does not answer that: the request originates from
// injected text, not from a person.
//
// Deliberately narrow. Private ranges (RFC1918) are NOT blocked: cloning from a
// self-hosted GitLab, Gitea, or GitHub Enterprise on an internal network is a normal
// thing to do, and breaking it would cost real users far more than this guard buys.
// This is also not a defense against DNS rebinding or a redirect chain, which would
// need resolution-time checks; it removes the one target that is never legitimate.
const BLOCKED_HOSTS = new Set([
  '100.100.100.200', // Alibaba Cloud metadata
  'fd00:ec2::254', // AWS IMDS over IPv6
  'metadata.google.internal', // GCP metadata, by name
]);

// 169.254.0.0/16 (IPv4 link-local) covers 169.254.169.254, used by AWS, GCP, Azure,
// DigitalOcean, and Oracle Cloud.
const LINK_LOCAL_IPV4_RE = /^169\.254\.\d{1,3}\.\d{1,3}$/;

/**
 * Extracts the host from a git remote value. Handles scheme URLs
 * (`https://host/owner/repo`) and scp-like syntax (`git@host:owner/repo`), and
 * returns null when neither applies, such as for an `owner/repo` shorthand.
 */
// inet_aton-style resolvers (used by ssh and libc) accept hex (0xa9fea9fe), octal
// (0251.0376.0251.0376), decimal (2852038142), and short dotted forms for an IPv4
// address. Canonicalize any such alias to a dotted quad so it compares equal to the
// blocked ranges; return null for anything that is not a pure numeric IPv4 form.
const ipv4AliasToDotted = (host: string): string | null => {
  const parts = host.split('.');
  if (parts.length > 4) {
    return null;
  }
  const values: number[] = [];
  for (const part of parts) {
    if (/^0x[0-9a-f]+$/.test(part)) {
      values.push(Number.parseInt(part.slice(2), 16));
    } else if (/^0[0-7]*$/.test(part)) {
      values.push(Number.parseInt(part, 8));
    } else if (/^[1-9][0-9]*$/.test(part)) {
      values.push(Number.parseInt(part, 10));
    } else {
      return null;
    }
  }
  // In inet_aton the last component fills the remaining bytes; earlier ones are octets.
  const tailBytes = 4 - (values.length - 1);
  const tail = values[values.length - 1];
  if (tail >= 2 ** (8 * tailBytes) || values.slice(0, -1).some((value) => value > 0xff)) {
    return null;
  }
  const bytes = values.slice(0, -1);
  for (let i = tailBytes - 1; i >= 0; i--) {
    bytes.push((tail >> (8 * i)) & 0xff);
  }
  return bytes.join('.');
};

// A raw scp-like host can spell an IPv6 address any way it likes
// (0:0:0:0:0:ffff:a9fe:a9fe); round-trip through the WHATWG parser to get the one
// canonical spelling before comparing. Non-IPv6 input is returned unchanged.
const canonicalizeIpv6 = (host: string): string => {
  try {
    return new URL(`http://[${host}]/`).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return host;
  }
};

// Strip the brackets URL parsing keeps around an IPv6 literal and a single
// trailing dot (the FQDN form of a name, e.g. metadata.google.internal.), unwrap an
// IPv4-mapped IPv6 literal (::ffff:169.254.169.254 / ::ffff:a9fe:a9fe target the
// embedded IPv4), and canonicalize numeric IPv4 aliases, so the result compares
// equal to a plain address or a blocked hostname.
const normalizeHost = (host: string): string => {
  let bare = host
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (bare.includes(':')) {
    bare = canonicalizeIpv6(bare);
  }
  const mapped = bare.match(/^::ffff:(?:(\d{1,3}(?:\.\d{1,3}){3})|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
  const unmapped = mapped
    ? (mapped[1] ??
      [Number.parseInt(mapped[2], 16), Number.parseInt(mapped[3], 16)]
        .flatMap((group) => [(group >> 8) & 0xff, group & 0xff])
        .join('.'))
    : bare;
  return ipv4AliasToDotted(unmapped) ?? unmapped;
};

export const extractRemoteHost = (remoteValue: string): string | null => {
  try {
    return normalizeHost(new URL(remoteValue).hostname);
  } catch {
    // Not a scheme URL. scp-like syntax has no scheme: user@host:path
    // git splits host from path at the FIRST colon (so neither user nor host may
    // contain one), and ssh treats everything before the LAST @ as the user, so
    // the host is matched after a greedy colon-free user part. It can be a
    // bracketed IPv6 literal (user@[fd00:ec2::254]:path), so match a bracketed
    // group before falling back to a plain host.
    const scpMatch = remoteValue.match(/^[^/:]+@(\[[^\]]+\]|[^/:@]+):/);
    return scpMatch ? normalizeHost(scpMatch[1]) : null;
  }
};

export const isMetadataEndpoint = (host: string): boolean => BLOCKED_HOSTS.has(host) || LINK_LOCAL_IPV4_RE.test(host);

/**
 * Throws when a remote value points at a cloud metadata endpoint.
 */
export const assertNotMetadataEndpoint = (remoteValue: string): void => {
  const host = extractRemoteHost(remoteValue);
  if (host !== null && isMetadataEndpoint(host)) {
    throw new RepomixError(`Refusing to access ${host}: it is a cloud instance metadata endpoint, not a git host.`);
  }
};
