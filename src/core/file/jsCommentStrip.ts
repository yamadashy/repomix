// Removes `//` and `/* */` comments from JavaScript and TypeScript source.
//
// The generic `@repomix/strip-comments` profile cannot tell a comment marker from the same
// characters inside code that is not a comment, so it cut files in several ways:
// - an empty string (`''`) was not recognised, so the scan treated everything up to the
//   next quote as a string and then cut at the `//` of a later `'https://...'`;
// - a quote inside a regex literal (`/'/`, `/["]/`) started a string;
// - `/*` or `//` inside a regex literal (`/[/*]/`) started a comment;
// - `//` and `/*` in JSX text (`<p>See https://example.com</p>`) started a comment;
// - a template literal right after a tag (`` styled.div`url(//cdn...)` ``) was not a string.
//
// This scanner tracks strings, template literals (with nested `${}`), regex literals and,
// when enabled, JSX, and only removes comments that appear in code. Newlines inside removed
// block comments are kept so line numbers do not shift.

type Frame =
  // Code. `braces` counts `{` opened inside this frame, so the `}` that closes a `${` or a
  // JSX `{` can be told apart from one that closes an object or block.
  | { kind: 'code'; braces: number }
  | { kind: 'template' }
  // JSX element tree. `depth` is the number of open elements; `inTag` is true between `<`
  // and `>`; `closing` is true inside a closing tag (`</div>`).
  | { kind: 'jsx'; depth: number; inTag: boolean; closing: boolean };

// After these keywords an expression starts, so a `/` begins a regex and a `<` may begin JSX.
const EXPRESSION_KEYWORDS = new Set([
  'await',
  'case',
  'delete',
  'do',
  'else',
  'extends',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);

// Non-ASCII characters count as identifier characters, except Unicode whitespace such as NBSP.
const isIdentifierChar = (char: string): boolean =>
  /[A-Za-z0-9_$]/.test(char) || (char.charCodeAt(0) > 0x7f && !/\s/.test(char));

// A JSX tag name followed by something that can only follow a tag name. Rejects TypeScript
// generics such as `<T,>`, `<T extends U>` and `<T = U>`, which are not JSX.
// A `<` after the name allows type arguments (`<Component<Props>>`).
const JSX_OPEN_TAG = /^<(?:>|[A-Za-z_$][\w$.:-]*(?=[\s/>{<]))/;
const NOT_JSX_AFTER_NAME = /^<[A-Za-z_$][\w$.:-]*\s*(?:,|=|extends\b)/;

const looksLikeJsx = (content: string, index: number): boolean => {
  const head = content.slice(index, index + 200);
  return JSX_OPEN_TAG.test(head) && !NOT_JSX_AFTER_NAME.test(head);
};

// Index just past the end of a quoted string that starts at `start`. Stops at an unescaped
// newline so an unterminated string cannot swallow the rest of the file.
const skipQuoted = (content: string, start: number, allowEscapes: boolean): number => {
  const quote = content[start];
  let i = start + 1;
  while (i < content.length) {
    const char = content[i];
    if (allowEscapes && char === '\\') {
      // A CRLF line continuation is three characters.
      i += content[i + 1] === '\r' && content[i + 2] === '\n' ? 3 : 2;
      continue;
    }
    if (char === quote) return i + 1;
    if (char === '\n' && allowEscapes) return i;
    i++;
  }
  return i;
};

// Index just past a regex literal starting at `start`, including its flags, or -1 when the
// `/` does not start a well-formed regex on this line (it is then treated as division).
const skipRegex = (content: string, start: number): number => {
  let i = start + 1;
  let inClass = false;
  while (i < content.length) {
    const char = content[i];
    if (char === '\n' || char === '\r') return -1;
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (inClass) {
      if (char === ']') inClass = false;
    } else if (char === '[') {
      inClass = true;
    } else if (char === '/') {
      i++;
      while (i < content.length && isIdentifierChar(content[i])) i++;
      return i;
    }
    i++;
  }
  return -1;
};

// Index of the end of a block comment starting at `start` (just past `*/`), or the end of input.
const findBlockCommentEnd = (content: string, start: number): number => {
  const end = content.indexOf('*/', start + 2);
  return end === -1 ? content.length : end + 2;
};

// Keeps every line terminator, which also keeps automatic semicolon insertion unchanged.
const newlinesOf = (text: string): string => text.replace(/[^\r\n\u2028\u2029]/g, '');

// JavaScript line terminators (ECMA-262 LineTerminator).
const isLineTerminator = (char: string): boolean =>
  char === '\n' || char === '\r' || char === '\u2028' || char === '\u2029';

const CONTROL_KEYWORD_BEFORE_PAREN = /(?:^|[^\w$.])(?:if|while|for(?:\s+await)?|with)\s*$/;

export const stripJsComments = (content: string, options: { jsx: boolean }): string => {
  const stack: Frame[] = [{ kind: 'code', braces: 0 }];
  let out = '';
  let i = 0;
  // Whether the next token is in expression position, where `/` starts a regex and `<`
  // may start JSX. True at the start of input and after operators and opening punctuation.
  let expressionStart = true;
  // For each open `(`, whether it follows a control keyword.
  const parens: boolean[] = [];

  const len = content.length;
  while (i < len) {
    const frame = stack[stack.length - 1];
    const char = content[i];
    const next = content[i + 1];

    if (frame.kind === 'template') {
      if (char === '\\') {
        out += content.slice(i, i + 2);
        i += 2;
      } else if (char === '`') {
        out += char;
        i++;
        stack.pop();
        expressionStart = false;
      } else if (char === '$' && next === '{') {
        out += '${';
        i += 2;
        stack.push({ kind: 'code', braces: 0 });
        expressionStart = true;
      } else {
        out += char;
        i++;
      }
      continue;
    }

    if (frame.kind === 'jsx') {
      if (!frame.inTag) {
        // JSX children: text, `{expression}` and nested elements. `//` and `/*` here are text.
        if (char === '{') {
          out += char;
          i++;
          stack.push({ kind: 'code', braces: 0 });
          expressionStart = true;
        } else if (char === '<') {
          frame.inTag = true;
          if (next === '/') {
            frame.closing = true;
            out += '</';
            i += 2;
          } else {
            frame.depth++;
            out += char;
            i++;
          }
        } else {
          out += char;
          i++;
        }
        continue;
      }

      // Inside a tag: attribute strings, `{expression}`, comments, `/>` and `>`.
      if (char === '"' || char === "'") {
        const end = skipQuoted(content, i, false);
        out += content.slice(i, end);
        i = end;
      } else if (char === '{') {
        out += char;
        i++;
        stack.push({ kind: 'code', braces: 0 });
        expressionStart = true;
      } else if (char === '/' && next === '/') {
        while (i < len && !isLineTerminator(content[i])) i++;
      } else if (char === '/' && next === '*') {
        const end = findBlockCommentEnd(content, i);
        out += newlinesOf(content.slice(i, end));
        i = end;
      } else if (char === '/' && next === '>') {
        out += '/>';
        i += 2;
        frame.inTag = false;
        frame.depth--;
      } else if (char === '>') {
        out += char;
        i++;
        frame.inTag = false;
        if (frame.closing) {
          frame.closing = false;
          frame.depth--;
        }
      } else {
        out += char;
        i++;
      }
      if (!frame.inTag && frame.depth <= 0) {
        stack.pop();
        expressionStart = false;
      }
      continue;
    }

    // Code.
    if (char === '/' && next === '/') {
      while (i < len && !isLineTerminator(content[i])) i++;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = findBlockCommentEnd(content, i);
      out += newlinesOf(content.slice(i, end));
      i = end;
      continue;
    }
    if (/\s/.test(char)) {
      out += char;
      i++;
      continue;
    }
    if (char === '/' && expressionStart) {
      const end = skipRegex(content, i);
      if (end !== -1) {
        out += content.slice(i, end);
        i = end;
        expressionStart = false;
        continue;
      }
    }
    if (char === '"' || char === "'") {
      const end = skipQuoted(content, i, true);
      out += content.slice(i, end);
      i = end;
      expressionStart = false;
      continue;
    }
    if (char === '`') {
      out += char;
      i++;
      stack.push({ kind: 'template' });
      continue;
    }
    if (char === '<' && options.jsx && expressionStart && looksLikeJsx(content, i)) {
      stack.push({ kind: 'jsx', depth: 0, inTag: false, closing: false });
      continue;
    }
    if (char === '{') {
      frame.braces++;
      out += char;
      i++;
      expressionStart = true;
      continue;
    }
    if (char === '}') {
      out += char;
      i++;
      if (frame.braces === 0 && stack.length > 1) {
        // Closes a `${` in a template literal or a `{` in JSX.
        stack.pop();
      } else {
        frame.braces = Math.max(0, frame.braces - 1);
      }
      // A `}` almost always ends a block (`if (a) {} /re/.test(s)`); dividing an object
      // literal is not realistic code, so a following `/` starts a regex.
      expressionStart = true;
      continue;
    }
    if (isIdentifierChar(char)) {
      let end = i + 1;
      while (end < len && isIdentifierChar(content[end])) end++;
      const word = content.slice(i, end);
      out += word;
      i = end;
      expressionStart = EXPRESSION_KEYWORDS.has(word);
      continue;
    }

    // Postfix `++` / `--` and TypeScript's non-null `!` end an expression, so a
    // following `/` is division, not a regex.
    if (!expressionStart && (char === '+' || char === '-') && next === char) {
      out += char + next;
      i += 2;
      continue;
    }
    if (!expressionStart && char === '!' && next !== '=') {
      out += char;
      i++;
      continue;
    }

    // A `)` that closes the condition of `if`, `while`, `for` or `with` is followed by a
    // statement, so a `/` after it starts a regex (`if (ok) /re/.test(s)`).
    if (char === '(') {
      parens.push(CONTROL_KEYWORD_BEFORE_PAREN.test(out.slice(-32)));
      out += char;
      i++;
      expressionStart = true;
      continue;
    }
    if (char === ')') {
      out += char;
      i++;
      expressionStart = parens.pop() ?? false;
      continue;
    }

    out += char;
    i++;
    expressionStart = char !== ']';
  }

  return out;
};
