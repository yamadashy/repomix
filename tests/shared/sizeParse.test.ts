import { describe, expect, it } from 'vitest';
import { parseHumanSizeToBytes } from '../../src/shared/sizeParse.js';

describe('parseHumanSizeToBytes', () => {
  it('parses kb', () => {
    expect(parseHumanSizeToBytes('1kb')).toBe(1024);
    expect(parseHumanSizeToBytes('2KB')).toBe(2048);
  });

  it('parses mb', () => {
    expect(parseHumanSizeToBytes('1mb')).toBe(1024 * 1024);
    expect(parseHumanSizeToBytes('3MB')).toBe(3 * 1024 * 1024);
  });

  it('rejects invalid formats', () => {
    expect(() => parseHumanSizeToBytes('100')).toThrow(/Invalid size/i);
    expect(() => parseHumanSizeToBytes('0kb')).toThrow(/positive integer/i);
    expect(() => parseHumanSizeToBytes('1gb')).toThrow(/Invalid size/i);
  });

  it('rejects values that would overflow safe integer range', () => {
    // 8589934592 is a safe integer, but 8589934592 * 1024 * 1024 = 9007199254740992 exceeds MAX_SAFE_INTEGER
    expect(() => parseHumanSizeToBytes('8589934592mb')).toThrow(/too large/i);
  });
});
