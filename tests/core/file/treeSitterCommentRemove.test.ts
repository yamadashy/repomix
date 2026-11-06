import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { removeCommentsWithTreeSitter, stripCommentRanges } from '../../../src/core/file/treeSitterCommentRemove.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';

describe('removeCommentsWithTreeSitter', () => {
  beforeEach(() => {
    silenceLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Each input holds a `//` or a quote that the regex-based stripper misread,
  // cutting the code after it as a comment.
  test.each([
    {
      name: 'a regex literal holding a quote',
      file: 'quote.ts',
      input: "const quote = /'/;\nconst url = 'https://example.com'; // docs\n",
      expected: "const quote = /'/;\nconst url = 'https://example.com';\n",
    },
    {
      name: 'an empty string literal',
      file: 'empty.ts',
      input: "const empty = '';\nconst url = 'https://example.com'; // docs\n",
      expected: "const empty = '';\nconst url = 'https://example.com';\n",
    },
    {
      name: 'a regex character class holding a comment opener',
      file: 'charClass.js',
      input: 'const re = /[/*]/g;\nconst keep = 1; /* note */\n',
      expected: 'const re = /[/*]/g;\nconst keep = 1;\n',
    },
    {
      name: 'a tagged template',
      file: 'styled.ts',
      input: 'const Box = styled.div`\n  background: url(//cdn.example.com/a.png);\n`; // box\n',
      expected: 'const Box = styled.div`\n  background: url(//cdn.example.com/a.png);\n`;\n',
    },
    {
      name: 'a nested template literal',
      file: 'nested.ts',
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal TypeScript source holding a template literal
      input: 'const s = `a ${`b // c`} d`; // e\n',
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal TypeScript source holding a template literal
      expected: 'const s = `a ${`b // c`} d`;\n',
    },
    {
      name: 'JSX text in a .tsx file',
      file: 'Link.tsx',
      input: 'export const Link = () => <p>Docs at https://example.com</p>; // link\n',
      expected: 'export const Link = () => <p>Docs at https://example.com</p>;\n',
    },
    {
      name: 'JSX text in a .jsx file',
      file: 'Hint.jsx',
      input: 'export const Hint = () => <p>Use // for comments</p>; // hint\n',
      expected: 'export const Hint = () => <p>Use // for comments</p>;\n',
    },
  ])('keeps the code around $name', async ({ file, input, expected }) => {
    expect(await removeCommentsWithTreeSitter(input, file)).toBe(expected);
  });

  test('empties the lines comments stood on, so later lines keep their line numbers', async () => {
    const input = '// header\nconst a = 1;\n/**\n * Docs\n */\nconst b = 2; // trailing\n';
    expect(await removeCommentsWithTreeSitter(input, 'lines.ts')).toBe('\nconst a = 1;\n\n\n\nconst b = 2;\n');
  });

  test('keeps a space where deleting a comment would join two tokens', async () => {
    const input = 'export default/* a */function f(x) {\n  return/* b */typeof/* c */x + /* d */+x;\n}\n';
    expect(await removeCommentsWithTreeSitter(input, 'join.js')).toBe(
      'export default function f(x) {\n  return typeof x + +x;\n}\n',
    );
  });

  test('adds no space next to brackets and closing punctuation', async () => {
    expect(await removeCommentsWithTreeSitter('f(/* a */x, [/* b */1]/* c */);\n', 'brackets.ts')).toBe('f(x, [1]);\n');
  });

  test('keeps the line break of a comment that spans lines between two statements', async () => {
    expect(await removeCommentsWithTreeSitter('const a = 1; /* one\ntwo */ const b = 2;\n', 'breaks.ts')).toBe(
      'const a = 1;\n const b = 2;\n',
    );
  });

  test('handles characters outside the Basic Multilingual Plane', async () => {
    const input = "const face = '😀'; // 絵文字\nconst word = 'ü'; /* コメント */\n";
    expect(await removeCommentsWithTreeSitter(input, 'unicode.ts')).toBe("const face = '😀';\nconst word = 'ü';\n");
  });

  test('keeps the comments past a part of the file the grammar cannot parse', async () => {
    // The tsx grammar fails on the bare `&` and resumes reading the rest of the
    // JSX text as code, where it finds a `//` comment.
    const input = [
      '// Pricing card',
      'export const Card = () => <p>Billing & Plans // not a comment</p>; // trailing',
      "const url = 'https://example.com'; // docs",
      '',
    ].join('\n');
    expect(await removeCommentsWithTreeSitter(input, 'Card.tsx')).toBe(
      [
        '',
        'export const Card = () => <p>Billing & Plans // not a comment</p>; // trailing',
        "const url = 'https://example.com';",
        '',
      ].join('\n'),
    );
  });

  test.each(['styles.css', 'script.py', 'App.vue', 'README.md'])(
    'leaves %s to its manipulator without loading a parser',
    async (file) => {
      const getLanguageParser = vi.fn();
      expect(await removeCommentsWithTreeSitter('/* a */ # b', file, { getLanguageParser })).toBeUndefined();
      expect(getLanguageParser).not.toHaveBeenCalled();
    },
  );

  test('returns undefined when tree-sitter fails, so the manipulator takes over', async () => {
    const getLanguageParser = vi.fn().mockRejectedValue(new Error('WASM abort'));
    expect(
      await removeCommentsWithTreeSitter('// a\nconst b = 1;\n', 'fail.ts', { getLanguageParser }),
    ).toBeUndefined();
  });
});

describe('stripCommentRanges', () => {
  test('leaves every line terminator a comment holds', () => {
    // U+2028 ends a line for automatic semicolon insertion, so it has to stay
    // between the two statements.
    const lineSeparator = String.fromCharCode(0x2028);
    const content = `a = 1 /*${lineSeparator}*/ b = 2`;
    const range = { start: content.indexOf('/*'), end: content.indexOf('*/') + 2 };
    expect(stripCommentRanges(content, [range])).toBe(`a = 1 ${lineSeparator} b = 2`);
  });
});
