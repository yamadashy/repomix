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
});
