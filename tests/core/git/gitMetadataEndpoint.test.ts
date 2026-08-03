import { describe, expect, it } from 'vitest';
import {
  assertNotMetadataEndpoint,
  extractRemoteHost,
  isMetadataEndpoint,
} from '../../../src/core/git/gitMetadataEndpoint.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

describe('gitMetadataEndpoint', () => {
  describe('extractRemoteHost', () => {
    it('reads the host from a scheme URL', () => {
      expect(extractRemoteHost('https://github.com/owner/repo.git')).toBe('github.com');
    });

    it('reads the host from scp-like syntax, which has no scheme to parse', () => {
      expect(extractRemoteHost('git@github.com:owner/repo.git')).toBe('github.com');
    });

    it('strips the brackets around an IPv6 literal so it compares as an address', () => {
      expect(extractRemoteHost('http://[fd00:ec2::254]/owner/repo')).toBe('fd00:ec2::254');
    });

    it('strips the brackets around an IPv6 literal in scp-like syntax too', () => {
      expect(extractRemoteHost('git@[fd00:ec2::254]:owner/repo.git')).toBe('fd00:ec2::254');
    });

    it('returns null for an owner/repo shorthand, which names no host', () => {
      expect(extractRemoteHost('yamadashy/repomix')).toBeNull();
    });

    it('lowercases the host so case cannot dodge a comparison', () => {
      expect(extractRemoteHost('https://GitHub.COM/owner/repo')).toBe('github.com');
    });

    it('drops a trailing dot so the FQDN form of a name still compares equal', () => {
      expect(extractRemoteHost('https://metadata.google.internal./x')).toBe('metadata.google.internal');
    });

    it('drops a trailing dot in scp-like syntax too', () => {
      expect(extractRemoteHost('git@metadata.google.internal.:owner/repo.git')).toBe('metadata.google.internal');
    });

    it('unwraps an IPv4-mapped IPv6 literal to the IPv4 it actually targets', () => {
      expect(extractRemoteHost('http://[::ffff:169.254.169.254]/x')).toBe('169.254.169.254');
      expect(extractRemoteHost('git@[::ffff:a9fe:a9fe]:owner/repo.git')).toBe('169.254.169.254');
    });

    it('canonicalizes an uncompressed IPv6 spelling before comparing', () => {
      expect(extractRemoteHost('git@[0:0:0:0:0:ffff:a9fe:a9fe]:owner/repo.git')).toBe('169.254.169.254');
      expect(extractRemoteHost('git@[fd00:0ec2:0:0:0:0:0:0254]:owner/repo.git')).toBe('fd00:ec2::254');
    });

    it('treats everything before the last @ as the user, the way ssh does', () => {
      expect(extractRemoteHost('git@x@169.254.169.254:owner/repo.git')).toBe('169.254.169.254');
    });

    it('splits host from path at the first colon, the way git does', () => {
      // A crafted path segment after the first colon must not displace the host.
      expect(extractRemoteHost('git@169.254.169.254:repo@github.com:x')).toBe('169.254.169.254');
    });

    it('canonicalizes inet_aton IPv4 aliases (hex, octal, decimal, short dotted)', () => {
      expect(extractRemoteHost('git@0xa9fea9fe:owner/repo.git')).toBe('169.254.169.254');
      expect(extractRemoteHost('git@0251.0376.0251.0376:owner/repo.git')).toBe('169.254.169.254');
      expect(extractRemoteHost('git@2852039166:owner/repo.git')).toBe('169.254.169.254');
      expect(extractRemoteHost('git@169.254.43518:owner/repo.git')).toBe('169.254.169.254');
      expect(extractRemoteHost('ssh://git@0xa9fea9fe/owner/repo')).toBe('169.254.169.254');
    });

    it('leaves ordinary hostnames untouched by the numeric-alias handling', () => {
      expect(extractRemoteHost('git@github.com:owner/repo.git')).toBe('github.com');
      expect(extractRemoteHost('git@0x.example.com:owner/repo.git')).toBe('0x.example.com');
    });
  });

  describe('isMetadataEndpoint', () => {
    it.each([
      ['169.254.169.254', 'AWS, GCP, Azure, DigitalOcean, Oracle'],
      ['169.254.170.2', 'ECS task metadata, same link-local block'],
      ['100.100.100.200', 'Alibaba Cloud'],
      ['fd00:ec2::254', 'AWS IMDS over IPv6'],
      ['metadata.google.internal', 'GCP metadata by name'],
    ])('blocks %s (%s)', (host) => {
      expect(isMetadataEndpoint(host)).toBe(true);
    });

    it.each([
      ['github.com'],
      ['gitlab.internal.example.com'],
      // Private ranges stay allowed on purpose: cloning from a self-hosted GitLab,
      // Gitea, or GHE on an internal network is a normal thing to do.
      ['10.0.0.5'],
      ['192.168.1.10'],
      ['172.16.0.1'],
      ['localhost'],
      // Not link-local: only 169.254.0.0/16 is.
      ['169.255.0.1'],
      ['169.25.4.1'],
    ])('allows %s', (host) => {
      expect(isMetadataEndpoint(host)).toBe(false);
    });
  });

  describe('assertNotMetadataEndpoint', () => {
    it('refuses a metadata endpoint and names it in the error', () => {
      expect(() => assertNotMetadataEndpoint('http://169.254.169.254/latest/meta-data')).toThrow(RepomixError);
      expect(() => assertNotMetadataEndpoint('http://169.254.169.254/latest/meta-data')).toThrow(/169\.254\.169\.254/);
    });

    it('refuses it through scp-like syntax too', () => {
      expect(() => assertNotMetadataEndpoint('git@169.254.169.254:owner/repo.git')).toThrow(RepomixError);
    });

    it('refuses a bracketed IPv6 metadata endpoint in scp-like syntax', () => {
      expect(() => assertNotMetadataEndpoint('git@[fd00:ec2::254]:owner/repo.git')).toThrow(RepomixError);
    });

    it('refuses the FQDN (trailing dot) form of a named metadata endpoint', () => {
      expect(() => assertNotMetadataEndpoint('https://metadata.google.internal./x')).toThrow(RepomixError);
    });

    it('refuses IPv4-mapped IPv6 and numeric-alias spellings of a metadata address', () => {
      expect(() => assertNotMetadataEndpoint('http://[::ffff:169.254.169.254]/x')).toThrow(RepomixError);
      expect(() => assertNotMetadataEndpoint('git@0xa9fea9fe:owner/repo.git')).toThrow(RepomixError);
      expect(() => assertNotMetadataEndpoint('git@x@169.254.169.254:owner/repo.git')).toThrow(RepomixError);
    });

    it('allows an ordinary remote', () => {
      expect(() => assertNotMetadataEndpoint('https://github.com/owner/repo.git')).not.toThrow();
      expect(() => assertNotMetadataEndpoint('owner/repo')).not.toThrow();
    });
  });
});
