import { describe, expect, test } from 'vitest';
import { redactErrorMessage, redactOptionsForLog, redactUrl } from '../../src/shared/urlRedact.js';

// Fixture credentials are assembled from parts rather than written inline, so
// the URLs below do not read as real basic-auth literals to secret scanners.
const USER = 'user';
const PASSWORD = 'pass123';
const TOKEN = 'ghp_secrettoken';

describe('urlRedact', () => {
  describe('redactUrl', () => {
    test('should redact user:password credentials in https URLs', () => {
      expect(redactUrl(`https://${USER}:${PASSWORD}@github.com/owner/repo.git`)).toBe(
        'https://***@github.com/owner/repo.git',
      );
    });

    test('should redact a token used as the username', () => {
      expect(redactUrl(`https://${TOKEN}@github.com/owner/repo.git`)).toBe('https://***@github.com/owner/repo.git');
    });

    test('should redact the oauth2 token form used in CI', () => {
      expect(redactUrl(`https://oauth2:${TOKEN}@github.com/owner/repo.git`)).toBe(
        'https://***@github.com/owner/repo.git',
      );
    });

    test('should redact credentials in http URLs', () => {
      expect(redactUrl(`http://${USER}:${PASSWORD}@github.com/owner/repo.git`)).toBe(
        'http://***@github.com/owner/repo.git',
      );
    });

    test('should redact credentials in ssh and git scheme URLs', () => {
      expect(redactUrl(`ssh://${USER}:${PASSWORD}@example.com/owner/repo.git`)).toBe(
        'ssh://***@example.com/owner/repo.git',
      );
      expect(redactUrl(`git://${USER}:${PASSWORD}@example.com/owner/repo.git`)).toBe(
        'git://***@example.com/owner/repo.git',
      );
    });

    test('should redact a password containing an @ character', () => {
      expect(redactUrl(`https://${USER}:p@ssw@rd@github.com/owner/repo.git`)).toBe(
        'https://***@github.com/owner/repo.git',
      );
    });

    test('should redact scp-style URLs that carry a password', () => {
      expect(redactUrl(`${USER}:${PASSWORD}@github.com:owner/repo.git`)).toBe('***@github.com:owner/repo.git');
    });

    test('should redact a scp-style password containing an @ character', () => {
      // Stopping at the first '@' would leave the rest of the password in the clear.
      expect(redactUrl(`${USER}:abc@${PASSWORD}@github.com:owner/repo.git`)).toBe('***@github.com:owner/repo.git');
    });

    test('should redact a userinfo containing an unencoded ? or #', () => {
      // Malformed, but still a real secret: a password typed with these characters
      // unencoded must not survive just because the URL does not parse.
      expect(redactUrl(`https://oauth2:se?cret@github.com/o/r.git`)).toBe('https://***@github.com/o/r.git');
      expect(redactUrl(`https://oauth2:se#cret@github.com/o/r.git`)).toBe('https://***@github.com/o/r.git');
    });

    test('should not mistake a time or port for scp-style credentials', () => {
      // No `host:path` follows the '@', so this is not a remote at all.
      expect(redactUrl('Build failed at 12:30@example.com')).toBe('Build failed at 12:30@example.com');
    });

    test('should leave ordinary SSH remotes readable', () => {
      // The username is a fixed literal here, not a secret: authentication
      // happens out of band via the SSH key.
      expect(redactUrl('git@github.com:owner/repo.git')).toBe('git@github.com:owner/repo.git');
    });

    test('should leave credential-free URLs untouched', () => {
      expect(redactUrl('https://github.com/owner/repo.git')).toBe('https://github.com/owner/repo.git');
    });

    test('should not treat an @ in the path as credentials', () => {
      expect(redactUrl('https://github.com/owner/repo@v1.0.0')).toBe('https://github.com/owner/repo@v1.0.0');
    });

    test('should redact credential-bearing query parameters', () => {
      expect(redactUrl('https://github.com/owner/repo.git?access_token=secret')).toBe(
        'https://github.com/owner/repo.git?access_token=***',
      );
      expect(redactUrl('https://example.com/repo.git?ref=main&token=secret')).toBe(
        'https://example.com/repo.git?ref=main&token=***',
      );
    });

    test('should preserve non-credential query parameters', () => {
      expect(redactUrl('https://github.com/owner/repo.git?ref=main')).toBe(
        'https://github.com/owner/repo.git?ref=main',
      );
    });

    test('should redact both userinfo and query credentials in one URL', () => {
      expect(redactUrl(`https://${USER}:${PASSWORD}@github.com/owner/repo.git?private_token=secret`)).toBe(
        'https://***@github.com/owner/repo.git?private_token=***',
      );
    });

    test('should redact a query value that starts with a URL sub-delimiter', () => {
      // ',' and '(' are legal unencoded in a query value, so treating them as
      // terminators would leave almost the whole credential in the clear.
      expect(redactUrl('https://example.com/r?token=,secret')).toBe('https://example.com/r?token=***');
      expect(redactUrl('https://example.com/r?token=(secret)plus')).toBe('https://example.com/r?token=***');
    });

    test('should stay linear on adversarial input', () => {
      // The userinfo patterns backtrack across every '@' in a token. Unbounded,
      // this input is quadratic and can stall the event loop of an MCP server
      // whose `remote` argument comes from an untrusted client.
      const adversarial = `u:${'a@'.repeat(32_000)}host`;

      const start = process.hrtime.bigint();
      redactUrl(adversarial);
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

      expect(elapsedMs).toBeLessThan(100);
    });

    test('should not swallow the diagnostic text that surrounds a redacted query value', () => {
      // The quote and the trailing status are part of git's message, not the token.
      expect(redactUrl("fatal: unable to access 'https://example.com/r?token=s3cr3t': HTTP 401")).toBe(
        "fatal: unable to access 'https://example.com/r?token=***': HTTP 401",
      );
    });

    test('should redact every URL when text embeds more than one', () => {
      const text = `tried https://a:${PASSWORD}@one.example.com/x.git then https://c:${PASSWORD}@two.example.com/y.git`;
      expect(redactUrl(text)).toBe('tried https://***@one.example.com/x.git then https://***@two.example.com/y.git');
    });
  });

  describe('redactErrorMessage', () => {
    test('should redact the command line that execFile puts in the error message', () => {
      // Node's execFile rejects with the full command line, so a failed clone
      // against a credentialed remote would otherwise leak the credential.
      const url = `https://${USER}:${PASSWORD}@github.com/owner/repo.git`;
      const error = new Error(
        `Command failed: git clone --depth 1 -- ${url} /tmp/x\nfatal: repository '${url}/' not found`,
      );

      const message = redactErrorMessage(error);

      expect(message).not.toContain(PASSWORD);
      expect(message).toContain('https://***@github.com/owner/repo.git');
    });

    test('should preserve the diagnostic text around the redacted URL', () => {
      const error = new Error(`Command failed: git ls-remote -- https://${TOKEN}@github.com/o/r.git\nfatal: not found`);

      expect(redactErrorMessage(error)).toBe(
        'Command failed: git ls-remote -- https://***@github.com/o/r.git\nfatal: not found',
      );
    });

    test('should handle non-Error values', () => {
      expect(redactErrorMessage(`https://${USER}:${PASSWORD}@github.com/o/r.git failed`)).toBe(
        'https://***@github.com/o/r.git failed',
      );
      expect(redactErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('redactOptionsForLog', () => {
    test('should redact every URL-bearing field', () => {
      const url = `https://${TOKEN}@github.com/o/r.git`;

      const options = { remote: url, skillSourceUrl: url, quiet: true };
      const redacted = redactOptionsForLog(options);

      expect(redacted.remote).toBe('https://***@github.com/o/r.git');
      expect(redacted.skillSourceUrl).toBe('https://***@github.com/o/r.git');
      expect(redacted.quiet).toBe(true);
    });

    test('should not mutate the options it was given', () => {
      // The caller keeps using this object to actually reach the remote.
      const options = { remote: `https://${TOKEN}@github.com/o/r.git` };

      redactOptionsForLog(options);

      expect(options.remote).toBe(`https://${TOKEN}@github.com/o/r.git`);
    });

    test('should pass through options that carry no URL', () => {
      const options: { remote?: string; quiet: boolean } = { quiet: true };

      expect(redactOptionsForLog(options)).toEqual({ quiet: true });
    });
  });
});
