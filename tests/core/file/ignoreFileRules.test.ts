import { describe, expect, test } from 'vitest';
import { parseIgnoreFileLines, rebaseIgnorePattern } from '../../../src/core/file/ignoreFileRules.js';

describe('ignoreFileRules', () => {
  describe('parseIgnoreFileLines', () => {
    test.each([
      ['plain rules', 'a\nb\n', ['a', 'b']],
      ['CRLF line endings', 'a\r\nb\r\n', ['a', 'b']],
      ['a byte order mark', '\uFEFFa\nb', ['a', 'b']],
      ['blank lines and comments', '\n# comment\na\n\n', ['a']],
      ['an escaped leading #', '\\#a\n', ['\\#a']],
      ['unescaped trailing whitespace', 'a  \nb\t\n', ['a', 'b']],
      ['a backslash-escaped trailing space', 'a\\ \n', ['a\\ ']],
      ['an escaped space followed by more spaces', 'a\\   \n', ['a\\ ']],
      ['an escaped backslash before trailing spaces', 'a\\\\  \n', ['a\\\\']],
      ['whitespace-only lines', '   \n\t\n', []],
      ['leading whitespace, which is significant', '  a\n', ['  a']],
    ])('handles %s', (_name, content, expected) => {
      expect(parseIgnoreFileLines(content)).toEqual(expected);
    });
  });

  describe('rebaseIgnorePattern', () => {
    test.each([
      // [pattern, base, expected]
      ['a.txt', '', 'a.txt'],
      ['!a.txt', '', '!a.txt'],
      ['a.txt', 'dir', 'dir/**/a.txt'],
      ['!a.txt', 'dir', '!dir/**/a.txt'],
      ['build/', 'dir', 'dir/**/build/'],
      ['!build/', 'dir', '!dir/**/build/'],
      ['/a.txt', 'dir', 'dir/a.txt'],
      ['!/a.txt', 'dir', '!dir/a.txt'],
      ['sub/a.txt', 'dir', 'dir/sub/a.txt'],
      ['sub/*/', 'dir', 'dir/sub/*/'],
      ['**/a.txt', 'dir', 'dir/**/a.txt'],
      ['*.log', 'dir/deeper', 'dir/deeper/**/*.log'],
    ])('rebases %j from %j to %j', (pattern, base, expected) => {
      expect(rebaseIgnorePattern(pattern, base)).toBe(expected);
    });

    test.each([
      ['x.txt', 'sp[1]', 'sp\\[1\\]/**/x.txt'],
      ['x.txt', 'a*b', 'a\\*b/**/x.txt'],
      ['x.txt', 'a?b', 'a\\?b/**/x.txt'],
      ['x.txt', 'back\\slash', 'back\\\\slash/**/x.txt'],
      ['x.txt', '!bang', '\\!bang/**/x.txt'],
      ['x.txt', '#hash', '\\#hash/**/x.txt'],
      ['!x.txt', '!bang', '!\\!bang/**/x.txt'],
    ])('escapes gitignore syntax in the directory name: %j in %j', (pattern, base, expected) => {
      expect(rebaseIgnorePattern(pattern, base)).toBe(expected);
    });

    test.each([
      ['../x', 'dir', 'dir/../x'],
      ['!../x', 'dir', '!dir/../x'],
      ['/../x', 'dir', 'dir/../x'],
      ['sub/../../x', 'dir', 'dir/sub/../../x'],
    ])('keeps %j from %j below its directory', (pattern, base, expected) => {
      expect(rebaseIgnorePattern(pattern, base)).toBe(expected);
    });
  });
});
