import { describe, expect, test } from 'vitest';
import { replaceInvalidXmlChars, replaceInvalidXmlCharsInValue } from '../../../src/core/output/xmlText.js';

describe('replaceInvalidXmlChars', () => {
  test('replaces every C0 control except tab, LF and CR', () => {
    for (let code = 0; code < 0x20; code++) {
      const char = String.fromCharCode(code);
      const expected = char === '\t' || char === '\n' || char === '\r' ? char : '�';
      expect(replaceInvalidXmlChars(`a${char}b`)).toBe(`a${expected}b`);
    }
  });

  test('replaces unpaired surrogates and the noncharacters U+FFFE and U+FFFF', () => {
    expect(replaceInvalidXmlChars('a\uD800b')).toBe('a�b');
    expect(replaceInvalidXmlChars('a\uDC00b')).toBe('a�b');
    expect(replaceInvalidXmlChars('\uDE00\uD83D')).toBe('��');
    expect(replaceInvalidXmlChars('a\uFFFEb\uFFFF')).toBe('a�b�');
  });

  test('keeps characters XML 1.0 allows', () => {
    const allowed = 'plain <&> "quoted" \u007F\u0085\u00A0 中文 😀 \uE000 �';
    expect(replaceInvalidXmlChars(allowed)).toBe(allowed);
  });
});

describe('replaceInvalidXmlCharsInValue', () => {
  test('sanitizes strings and passes other values through', () => {
    expect(replaceInvalidXmlCharsInValue('path', 'a\fb')).toBe('a�b');
    expect(replaceInvalidXmlCharsInValue('count', 42)).toBe(42);
    expect(replaceInvalidXmlCharsInValue('missing', undefined)).toBeUndefined();
  });
});
