import { afterEach, describe, expect, test } from 'vitest';
import {
  isKernelConfinedProcess,
  isSandboxToken,
  makeSandboxToken,
  SANDBOX_TOKEN_ENV,
} from '../../src/shared/sandboxEnv.js';

describe('sandbox confinement token', () => {
  test('makeSandboxToken produces a 32-char lowercase-hex token that validates', () => {
    const t = makeSandboxToken();
    expect(t).toMatch(/^[0-9a-f]{32}$/);
    expect(isSandboxToken(t)).toBe(true);
    // two calls differ (per-invocation, unguessable)
    expect(makeSandboxToken()).not.toBe(t);
  });

  test('isSandboxToken rejects the legacy/stray "1" and other non-token values (fail-open guard)', () => {
    expect(isSandboxToken('1')).toBe(false);
    expect(isSandboxToken('')).toBe(false);
    expect(isSandboxToken(undefined)).toBe(false);
    expect(isSandboxToken('not-a-token')).toBe(false);
    expect(isSandboxToken('ABCDEF0123456789ABCDEF0123456789')).toBe(false); // uppercase
    expect(isSandboxToken('0123456789abcdef')).toBe(false); // too short
  });
});

describe('isKernelConfinedProcess', () => {
  const prev = process.env[SANDBOX_TOKEN_ENV];
  afterEach(() => {
    if (prev === undefined) delete process.env[SANDBOX_TOKEN_ENV];
    else process.env[SANDBOX_TOKEN_ENV] = prev;
  });

  test('true only when the env holds a well-formed confinement token', () => {
    process.env[SANDBOX_TOKEN_ENV] = makeSandboxToken();
    expect(isKernelConfinedProcess()).toBe(true);
  });

  test('false when the token is absent or malformed — a stray value must not read as confined', () => {
    delete process.env[SANDBOX_TOKEN_ENV];
    expect(isKernelConfinedProcess()).toBe(false);
    process.env[SANDBOX_TOKEN_ENV] = '1';
    expect(isKernelConfinedProcess()).toBe(false);
  });
});
