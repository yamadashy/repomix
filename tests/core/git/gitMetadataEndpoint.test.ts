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

    it('returns null for an owner/repo shorthand, which names no host', () => {
      expect(extractRemoteHost('yamadashy/repomix')).toBeNull();
    });

    it('lowercases the host so case cannot dodge a comparison', () => {
      expect(extractRemoteHost('https://GitHub.COM/owner/repo')).toBe('github.com');
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

    it('allows an ordinary remote', () => {
      expect(() => assertNotMetadataEndpoint('https://github.com/owner/repo.git')).not.toThrow();
      expect(() => assertNotMetadataEndpoint('owner/repo')).not.toThrow();
    });
  });
});
