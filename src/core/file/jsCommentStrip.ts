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

// A `{ }` scope in code: whether it is an object literal, how many `(` were open when it
// started, and how many `?` of a conditional expression at its own level await their `:`.
type Scope = { object: boolean; parens: number; ternary: number };

type Frame =
  // Code. `braces` has one entry per `{` opened inside this frame, so the `}` that closes a
  // `${` or a JSX `{` can be told apart from one that closes an object or block. `top` is the
  // frame's own level, outside any of those braces.
  | { kind: 'code'; braces: Scope[]; top: Scope }
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

const CONTROL_KEYWORDS = new Set(['if', 'while', 'for', 'with']);

// Tokens after which a `{` opens an object literal rather than a block.
const OBJECT_BRACE_AFTER = new Set([
  '=',
  '(',
  '[',
  ',',
  ':',
  '?',
  '!',
  '&',
  '|',
  '+',
  '-',
  '*',
  '%',
  '^',
  '~',
  '<',
  '>',
]);
const OBJECT_BRACE_AFTER_KEYWORDS = new Set([
  'return',
  'throw',
  'typeof',
  'void',
  'delete',
  'await',
  'yield',
  'in',
  'of',
  'case',
  'new',
]);

// Generic type arguments in a JSX opening tag (`<List<Item> />`): the text with its comments
// removed (line terminators kept) and the index just past the matching `>`. Strings and `=>`
// are skipped, and `<`, `>` and quotes inside comments are ignored.
const skipTypeArguments = (content: string, start: number): { text: string; end: number } => {
  let depth = 0;
  let i = start;
  let text = '';
  while (i < content.length) {
    const char = content[i];
    const next = content[i + 1];
    if (char === '/' && next === '/') {
      while (i < content.length && !isLineTerminator(content[i])) i++;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = findBlockCommentEnd(content, i);
      text += newlinesOf(content.slice(i, end));
      i = end;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      const end = skipQuoted(content, i, true);
      text += content.slice(i, end);
      i = end;
      continue;
    }
    if (char === '=' && next === '>') {
      text += '=>';
      i += 2;
      continue;
    }
    text += char;
    i++;
    if (char === '<') depth++;
    if (char === '>') {
      depth--;
      if (depth === 0) return { text, end: i };
    }
  }
  return { text, end: i };
};

export const stripJsComments = (content: string, options: { jsx: boolean }): string => {
  // For each open `(`, whether it follows a control keyword.
  const parens: boolean[] = [];
  const codeFrame = (): Frame => ({
    kind: 'code',
    braces: [],
    top: { object: false, parens: parens.length, ternary: 0 },
  });
  const stack: Frame[] = [codeFrame()];
  let out = '';
  let i = 0;
  // Whether the next token is in expression position, where `/` starts a regex and `<`
  // may start JSX. True at the start of input and after operators and opening punctuation.
  let expressionStart = true;
  // The last two tokens (identifier words or punctuation; whitespace and comments skipped),
  // and whether a line terminator came after the last one.
  let prevToken = '';
  let prevToken2 = '';
  let newlineSinceToken = false;
  const token = (value: string) => {
    prevToken2 = prevToken;
    prevToken = value;
    newlineSinceToken = false;
  };

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
        token('`');
      } else if (char === '$' && next === '{') {
        out += '${';
        i += 2;
        stack.push(codeFrame());
        expressionStart = true;
        token('{');
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
          stack.push(codeFrame());
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
        stack.push(codeFrame());
        expressionStart = true;
      } else if (char === '/' && next === '/') {
        while (i < len && !isLineTerminator(content[i])) i++;
      } else if (char === '/' && next === '*') {
        const end = findBlockCommentEnd(content, i);
        out += newlinesOf(content.slice(i, end));
        i = end;
      } else if (char === '<' && !frame.closing) {
        const { text, end } = skipTypeArguments(content, i);
        out += text;
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
        token('>');
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
      const kept = newlinesOf(content.slice(i, end));
      if (kept) newlineSinceToken = true;
      out += kept;
      i = end;
      continue;
    }
    if (/\s/.test(char)) {
      if (isLineTerminator(char)) newlineSinceToken = true;
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
        token('/');
        continue;
      }
    }
    if (char === '"' || char === "'") {
      const end = skipQuoted(content, i, true);
      out += content.slice(i, end);
      i = end;
      expressionStart = false;
      token('"');
      continue;
    }
    if (char === '`') {
      out += char;
      i++;
      stack.push({ kind: 'template' });
      token('`');
      continue;
    }
    if (char === '<' && options.jsx && expressionStart && looksLikeJsx(content, i)) {
      stack.push({ kind: 'jsx', depth: 0, inTag: false, closing: false });
      continue;
    }
    if (char === '{') {
      // An object literal follows an operator or opening punctuation; anything else
      // (start of input, `;`, `)`, `=>`, `else`, the `:` of a label or `case`, ...) opens a
      // block. After `return` and a line terminator, automatic semicolon insertion ends the
      // `return`, so the `{` opens a block.
      const asiBlock = (prevToken === 'return' || prevToken === 'yield') && newlineSinceToken;
      const object = !asiBlock && (OBJECT_BRACE_AFTER.has(prevToken) || OBJECT_BRACE_AFTER_KEYWORDS.has(prevToken));
      frame.braces.push({ object, parens: parens.length, ternary: 0 });
      out += char;
      i++;
      expressionStart = true;
      token('{');
      continue;
    }
    if (char === '}') {
      out += char;
      i++;
      let objectLiteral = false;
      if (frame.braces.length === 0 && stack.length > 1) {
        // Closes a `${` in a template literal or a `{` in JSX.
        stack.pop();
      } else {
        objectLiteral = frame.braces.pop()?.object ?? false;
      }
      // After a block (`if (a) {} /re/.test(s)`) a `/` starts a regex; after an object
      // literal (`{ valueOf } / 2`) it is division.
      expressionStart = !objectLiteral;
      token('}');
      continue;
    }
    if (isIdentifierChar(char)) {
      let end = i + 1;
      while (end < len && isIdentifierChar(content[end])) end++;
      const word = content.slice(i, end);
      out += word;
      i = end;
      expressionStart = EXPRESSION_KEYWORDS.has(word);
      token(word);
      continue;
    }

    // Postfix `++` / `--` and TypeScript's non-null `!` end an expression, so a
    // following `/` is division, not a regex. On a new line, `++` and `!` are prefix
    // operators (automatic semicolon insertion); on the same line, spaces or comments may
    // come between the operand and a postfix operator.
    if (!expressionStart && !newlineSinceToken && (char === '+' || char === '-') && next === char) {
      out += char + next;
      i += 2;
      token(char + next);
      continue;
    }
    if (!expressionStart && !newlineSinceToken && char === '!' && next !== '=') {
      out += char;
      i++;
      token('!x');
      continue;
    }

    // A `)` that closes the condition of `if`, `while`, `for` or `with` is followed by a
    // statement, so a `/` after it starts a regex (`if (ok) /re/.test(s)`).
    if (char === '(') {
      const control =
        prevToken2 !== '.' && (CONTROL_KEYWORDS.has(prevToken) || (prevToken === 'await' && prevToken2 === 'for'));
      parens.push(control);
      out += char;
      i++;
      expressionStart = true;
      token('(');
      continue;
    }
    if (char === ')') {
      out += char;
      i++;
      expressionStart = parens.pop() ?? false;
      token(')');
      continue;
    }

    // `??` and `?.` are not the `?` of a conditional expression.
    if (char === '?' && (next === '?' || (next === '.' && !/[0-9]/.test(content[i + 2] ?? '')))) {
      out += char + next;
      i += 2;
      expressionStart = true;
      token(char + next);
      continue;
    }

    // A `:` is a label or `case` colon, after which `{` opens a block, unless it is inside
    // parentheses, an object literal, or ends the `?` of a conditional expression.
    const scope = frame.braces[frame.braces.length - 1] ?? frame.top;
    let value = char === '>' && prevToken === '=' && content[i - 1] === '=' ? '=>' : char;
    if (char === '?' && parens.length === scope.parens) {
      scope.ternary++;
    } else if (char === ':' && parens.length === scope.parens) {
      if (scope.ternary > 0) scope.ternary--;
      else if (!scope.object) value = 'label:';
    }
    out += char;
    i++;
    expressionStart = char !== ']';
    token(value);
  }

  return out;
};
