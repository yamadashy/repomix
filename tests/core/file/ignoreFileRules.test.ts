import { describe, expect, test } from 'vitest';
import { parseIgnoreFileLines, rebaseIgnorePattern } from '../../../src/core/file/ignoreFileRules.js';

describe('ignoreFileRules', () => {
  describe('parseIgnoreFileLines', () => {
    test.each([
      ['plain rules', 'a\nb\n', ['a', 'b']],
      ['CRLF line endings', 'a\r\nb\r\n', ['a', 'b']],
      ['a byte order mark', '\uFEFFa\nb', ['a', 'b']],
      // Git strips a byte order mark only at the start of the file.
      ['a byte order mark on a later line', 'a\n\uFEFFb\n', ['a', '\uFEFFb']],
      ['blank lines and comments', '\n# comment\na\n\n', ['a']],
      ['an escaped leading #', '\\#a\n', ['\\#a']],
      ['unescaped trailing spaces', 'a  \nb \n', ['a', 'b']],
      // Git strips only spaces: a trailing tab or no-break space is part of the rule.
      ['trailing whitespace other than spaces', 'a\t\nb\u00a0\nc\t  \n', ['a\t', 'b\u00a0', 'c\t']],
      // One CR before the LF, or at the end of the file, is part of the line ending.
      ['a CR at the end of the file', 'a\nb\r', ['a', 'b']],
      ['only one CR per line ending', 'a\r\r\nb  \r\n', ['a\r', 'b']],
      ['a backslash-escaped trailing space', 'a\\ \n', ['a\\ ']],
      ['an escaped space followed by more spaces', 'a\\   \n', ['a\\ ']],
      ['an escaped backslash before trailing spaces', 'a\\\\  \n', ['a\\\\']],
      ['space-only lines', '   \n \r\n', []],
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

    test('leaves a lone `!` alone, so it re-includes nothing', () => {
      expect(rebaseIgnorePattern('!', 'dir')).toBe('!');
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
      ['../x', 'dir'],
      ['!../x', 'dir'],
      ['/../x', 'dir'],
      ['sub/../../x', 'dir'],
      // Normalised, these would match the directory itself (`dir`, `dir/`), which `!` would re-include.
      ['x/..', 'dir'],
      ['!../', 'dir'],
      ['!/./', 'dir'],
      // Normalised, these would match `dir/**`, `dir/y` and `dir/b/c`.
      ['.', 'dir'],
      ['./y', 'dir'],
      ['b//c', 'dir'],
      ['/', 'dir'],
      ['//x', 'dir'],
    ])('drops %j from %j, a rule with a `.`, `..` or empty segment, which git never matches', (pattern, base) => {
      expect(rebaseIgnorePattern(pattern, base)).toBeUndefined();
    });

    test.each([
      ['.x', 'dir', 'dir/**/.x'],
      ['x./', 'dir', 'dir/**/x./'],
      ['..x/y', 'dir', 'dir/..x/y'],
      ['\\./y', 'dir', 'dir/\\./y'],
    ])('keeps %j from %j, whose dots are part of a name', (pattern, base, expected) => {
      expect(rebaseIgnorePattern(pattern, base)).toBe(expected);
    });
  });
});
