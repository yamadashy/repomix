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
export const extractRemoteHost = (remoteValue: string): string | null => {
  try {
    // Strip the brackets URL parsing keeps around an IPv6 literal, so the result
    // can be compared with a plain address.
    return new URL(remoteValue).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    // Not a scheme URL. scp-like syntax has no scheme: user@host:path
    const scpMatch = remoteValue.match(/^[^/@]+@([^/:]+):/);
    return scpMatch ? scpMatch[1].toLowerCase() : null;
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
