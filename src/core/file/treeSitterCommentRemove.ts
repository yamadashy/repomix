import path from 'node:path';
import type { Node, Tree } from 'web-tree-sitter';
import { logger } from '../../shared/logger.js';
import { getLanguageConfigByExtension, type SupportedLang } from '../treeSitter/languageConfig.js';
import { LanguageParser } from '../treeSitter/languageParser.js';
import { getLanguageParserSingleton } from '../treeSitter/parseFile.js';
import { rtrimLines } from './fileManipulate.js';

// strip-comments scans JavaScript with regexes: a quote, `//` or `/*` inside a
// regex literal, a template literal or JSX text, or an empty string literal,
// throws it off, and it cuts the code from there as a comment. For these
// languages the comments come from tree-sitter's syntax tree instead.
const TREE_SITTER_LANGUAGES: ReadonlySet<SupportedLang> = new Set(['javascript', 'typescript', 'tsx']);

// ECMAScript line terminators. A comment spanning lines leaves the ones it holds
// in its place: they keep automatic semicolon insertion splitting the statements
// around it the same way, and every later line at its line number.
const LINE_TERMINATORS = /[\n\r\u2028\u2029]/g;

// No token merges with an opening bracket in front of it or with closing
// punctuation after it, so a comment between them needs no space in its place:
// `f(/* a */x)` becomes `f(x)`.
const OPENING_BRACKETS = '([{';
const CLOSING_PUNCTUATION = ')]},;';

const needsSpace = (before: string | undefined, after: string | undefined): boolean =>
  before !== undefined &&
  after !== undefined &&
  !/\s/.test(before) &&
  !/\s/.test(after) &&
  !OPENING_BRACKETS.includes(before) &&
  !CLOSING_PUNCTUATION.includes(after);

export interface CommentRange {
  start: number;
  end: number;
}

// Deletes the comment ranges (sorted, non-overlapping) the way the regex-based
// strippers do: the lines a comment stood on stay, emptied, and trailing
// whitespace is trimmed. A comment within one line leaves a space where deleting
// it would join two tokens, as in `return/*x*/a`.
export const stripCommentRanges = (content: string, ranges: readonly CommentRange[]): string => {
  const parts: string[] = [];
  let cursor = 0;
  let last: string | undefined;
  for (const { start, end } of ranges) {
    const code = content.slice(cursor, start);
    if (code !== '') {
      parts.push(code);
      last = code[code.length - 1];
    }
    const terminators = content.slice(start, end).match(LINE_TERMINATORS);
    if (terminators) {
      parts.push(terminators.join(''));
      last = '\n';
    } else if (needsSpace(last, content[end])) {
      parts.push(' ');
      last = ' ';
    }
    cursor = end;
  }
  parts.push(content.slice(cursor));
  return rtrimLines(parts.join(''));
};

const isBroken = (node: Node): boolean => node.hasError || node.isMissing;

// Where the first ERROR or MISSING node in the subtree starts.
const firstErrorStart = (node: Node): number => {
  let current = node;
  for (;;) {
    if (current.isError || current.isMissing) return current.startIndex;
    const child = current.children.find(isBroken);
    if (child === undefined) return current.startIndex;
    current = child;
  }
};

// The bundled grammars fail on some valid code (`export type * from`, a bare `&`
// in JSX text). Past such an error, tree-sitter can resume in the wrong context
// and read JSX text or a string as code, with comments in it, so nothing is
// trusted from the first error in a top-level statement up to the next
// top-level statement that parses cleanly.
const untrustedSpans = (root: Node): CommentRange[] => {
  if (root.isError) return [{ start: 0, end: Number.POSITIVE_INFINITY }];
  const spans: CommentRange[] = [];
  let start: number | undefined;
  for (const child of root.children) {
    if (child.isExtra) continue;
    if (isBroken(child)) {
      start ??= firstErrorStart(child);
    } else if (start !== undefined) {
      spans.push({ start, end: child.startIndex });
      start = undefined;
    }
  }
  if (start !== undefined) spans.push({ start, end: Number.POSITIVE_INFINITY });
  return spans;
};

const findCommentRanges = (root: Node): CommentRange[] => {
  const untrusted = root.hasError ? untrustedSpans(root) : [];
  return root
    .descendantsOfType('comment')
    .map((node) => ({ start: node.startIndex, end: node.endIndex }))
    .filter((comment) => !untrusted.some((span) => comment.end > span.start && comment.start < span.end))
    .sort((a, b) => a.start - b.start);
};

/**
 * Removes the comments of a JavaScript or TypeScript file, located with
 * tree-sitter. Returns undefined for other files and when tree-sitter fails, so
 * that the caller falls back to the file's manipulator.
 */
export const removeCommentsWithTreeSitter = async (
  content: string,
  filePath: string,
  deps = {
    getLanguageParser: (): Promise<LanguageParser> => getLanguageParserSingleton(() => new LanguageParser()),
  },
): Promise<string | undefined> => {
  const lang = getLanguageConfigByExtension(path.extname(filePath).toLowerCase().slice(1))?.name;
  if (lang === undefined || !TREE_SITTER_LANGUAGES.has(lang)) {
    return undefined;
  }

  let tree: Tree | null | undefined;
  try {
    const parser = await (await deps.getLanguageParser()).getParserForLang(lang);
    tree = parser.parse(content);
    if (!tree) {
      return undefined;
    }

    return stripCommentRanges(content, findCommentRanges(tree.rootNode));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`Could not remove comments from ${filePath} with tree-sitter: ${message}`);
    return undefined;
  } finally {
    tree?.delete();
  }
};
