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
// This is a tokenizer that tracks strings, template literals (with nested `${}`), regex
// literals and, when enabled, JSX, and only removes comments that appear in code. Newlines
// inside removed block comments are kept so line numbers and automatic semicolon insertion
// do not change.
//
// Whether a `/` starts a regex or is division depends on the token before it. As in Acorn's
// tokenizer, that is decided from the previous token and a stack of bracket contexts: after
// an operator, an opening bracket or a keyword such as `return` an expression starts; after
// an identifier, a literal, `)`, `]` or the `}` of an object literal an expression has ended.
// The cases that need more than the previous token are:
// - `)`: it ends the condition of `if`, `while`, `for` or `with`, after which a statement
//   starts, or else a parenthesised expression or call;
// - `}`: it closes a block, after which a statement starts, or an object literal, a class
//   expression or a function expression, after which an expression has ended;
// - `{`: whether it opens a block or an object literal, decided from the token before it
//   (a block follows `)`, `=>`, `else`, a label, a `case`, the start of a statement and,
//   in TypeScript, a declaration header such as `class A extends B<C>`);
// - `!`, `++` and `--`: prefix operators, or postfix ones (including TypeScript's non-null
//   `value!`) that end an expression. A line break before them makes them prefix.
// A `/` in expression position that cannot be a regex on its line is treated as division.

type Scope = {
  kind: 'brace' | 'paren' | 'bracket';
  // A brace scope: whether it is a block (statements) rather than an object literal or type
  // literal, and whether it is the body of a function or class expression.
  block: boolean;
  expressionBody: boolean;
  // A brace scope opened by `${` in a template literal or by `{` in JSX.
  closes?: 'template' | 'jsx';
  // A paren scope: whether it is the head of `if`, `while`, `for` or `with`.
  control: string;
  // Inside this scope: a `case` whose `:` is still to come; a `function` or `class` whose body
  // is still to come (and whether it is an expression); a declaration header or a return
  // type annotation is being read, so a `{` after `>` opens a body.
  pendingCase: boolean;
  caseConditionals: number;
  pendingFunction: { expression: boolean } | null;
  inHeader: boolean;
  // Unclosed `<` of type arguments or parameters in that header (`Promise<(a) => { b: 1 }>`),
  // inside which every `{` is a type literal.
  headerAngles: number;
  // A brace scope that is the body of `switch (...)`, the only place where `case` and
  // `default` clauses are legal; a `case`- or `default`-named object key must not change
  // state, so the keyword is recognised by position rather than by its spelling alone.
  switchBody: boolean;
  // A `)` just closed the head of `switch`, so the next `{` opens a switch body.
  pendingSwitch: boolean;
  // A TypeScript `type X = ...` alias is being read; it ends at `;` or, by automatic
  // semicolon insertion, at a line break before a token that cannot continue the type.
  inTypeAlias: boolean;
};

type Mode =
  | { kind: 'code' }
  | { kind: 'template' }
  // JSX element tree. `depth` is the number of open elements; `inTag` is true between `<`
  // and `>`; `closing` is true inside a closing tag (`</div>`).
  | { kind: 'jsx'; depth: number; inTag: boolean; closing: boolean }
  // TypeScript type arguments of a JSX tag (`<List<Item>>`), scanned as code.
  | { kind: 'typeArgs'; depth: number };

// After these keywords an expression starts, so a `/` begins a regex and a `<` may begin JSX.
const EXPRESSION_KEYWORDS = new Set([
  'await',
  'case',
  'default',
  'delete',
  'do',
  'else',
  'extends',
  'in',
  'instanceof',
  'new',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);

// After these keywords a `{` opens a block.
const BLOCK_KEYWORDS = new Set(['else', 'do', 'try', 'finally', 'catch', 'static']);

// After these keywords a `{` opens a destructuring pattern, not a block.
const DECLARATION_KEYWORDS = new Set(['const', 'let', 'var', 'using']);

// Keywords that always start a declaration header, wherever they appear: a `{` after a `>`
// in it opens the body (`class A extends B<C> {`, `function f(): Promise<T> {`).
const RESERVED_HEADER_KEYWORDS = new Set(['class', 'function', 'implements']);

// Contextual declaration keywords. They are also ordinary identifiers in expressions and
// object keys (`const module = 4`, `{ namespace: 1 }`), so they only start a header where a
// declaration can appear. Treating them as keywords everywhere turned `module > {` into a
// declaration body and made the `/` after it look like a regex.
const DECLARATION_HEADER_KEYWORDS = new Set(['interface', 'enum', 'namespace', 'module']);

// Modifiers that do not end the start of a statement (`export default function`,
// `declare const`, `abstract class`, `async function`).
const MODIFIERS = new Set(['export', 'declare', 'abstract', 'async', 'default']);

// Words that continue an expression or a type on the next line.
const CONTINUING_WORDS = new Set(['in', 'instanceof', 'of', 'as', 'satisfies', 'extends', 'implements', 'is', 'keyof']);

const CONTROL_KEYWORDS = new Set(['if', 'while', 'for', 'with', 'switch']);

// Statements that consist of a keyword only (plus an optional label), after which automatic
// semicolon insertion ends the statement: `debugger` then a regex statement on the next line.
const STATEMENT_KEYWORDS = new Set(['debugger', 'break', 'continue']);

// Non-ASCII characters count as identifier characters, except Unicode whitespace such as NBSP.
const isIdentifierChar = (char: string | undefined): boolean =>
  char !== undefined && (/[A-Za-z0-9_$]/.test(char) || (char.charCodeAt(0) > 0x7f && !/\s/.test(char)));

// JavaScript line terminators (ECMA-262 LineTerminator).
const isLineTerminator = (char: string | undefined): boolean =>
  char === '\n' || char === '\r' || char === '\u2028' || char === '\u2029';

// Keeps every line terminator, which also keeps automatic semicolon insertion unchanged.
const newlinesOf = (text: string): string => text.replace(/[^\r\n\u2028\u2029]/g, '');

// Characters that would join into one token if the comment between them were removed
// (`typeof/**/x`, `a+/**/+b`, `1/**/.toString()`).
const JOINING_PUNCTUATION = '+-*/%<>=!&|^?.:';
const wouldJoin = (before: string | undefined, after: string | undefined): boolean =>
  before !== undefined &&
  after !== undefined &&
  ((isIdentifierChar(before) && isIdentifierChar(after)) ||
    (JOINING_PUNCTUATION.includes(before) && JOINING_PUNCTUATION.includes(after)) ||
    (/[0-9]/.test(before) && after === '.'));

// Sticky, so `lastIndex` selects the start. A `^` anchor would still require offset zero and
// fail for every token after the first (`1.` in `const n = 1. / 2`), which then let the `.`
// open expression position and turned the following slash into a regex.
const NUMBER = /(?:0[xXbBoO][0-9a-fA-F_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?)/y;

// Longest-first punctuators.
const PUNCTUATORS = [
  '>>>=',
  '...',
  '===',
  '!==',
  '**=',
  '<<=',
  '>>=',
  '>>>',
  '&&=',
  '||=',
  '??=',
  '=>',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '??',
  '?.',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '**',
  '<<',
  '>>',
];

// A JSX tag name followed by something that can only follow a tag name. Rejects TypeScript
// generics such as `<T,>`, `<T extends U>` and `<T = U>`, which are not JSX.
// A `<` after the name allows type arguments (`<Component<Props>>`).
const JSX_OPEN_TAG = /^<(?:>|[A-Za-z_$][\w$.:-]*(?=[\s/>{<]))/;
const NOT_JSX_AFTER_NAME = /^<[A-Za-z_$][\w$.:-]*\s*(?:,|=|extends\b)/;

const looksLikeJsx = (content: string, index: number): boolean => {
  const head = content.slice(index, index + 200);
  return JSX_OPEN_TAG.test(head) && !NOT_JSX_AFTER_NAME.test(head);
};

// Index just past the end of a quoted string that starts at `start`. With escapes (code),
// it stops at a line break so an unterminated string cannot swallow the rest of the file;
// JSX attribute strings have no escapes and may span lines.
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
    if (allowEscapes && (char === '\n' || char === '\r')) return i;
    i++;
  }
  return i;
};

// Index just past a regex literal starting at `start`, including its flags, or -1 when the
// `/` does not start a well-formed regex on this line.
const skipRegex = (content: string, start: number): number => {
  let i = start + 1;
  let inClass = false;
  while (i < content.length) {
    const char = content[i];
    if (isLineTerminator(char)) return -1;
    if (char === '\\') {
      if (isLineTerminator(content[i + 1])) return -1;
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

// The next character that is not whitespace on the same line, skipping nothing else.
const peekSameLine = (content: string, index: number): string | undefined => {
  let i = index;
  while (i < content.length && /\s/.test(content[i]) && !isLineTerminator(content[i])) i++;
  return content[i];
};

// The next significant character on the same line, stepping over spaces and block comments
// that contain no line terminator: `async/**/function` is still one declaration head. A line
// terminator or a line comment ends the line, so lookahead gives up there.
const peekSignificantSameLine = (content: string, index: number): string | undefined => {
  let i = index;
  while (i < content.length) {
    const char = content[i];
    if (isLineTerminator(char)) return undefined;
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (char === '/' && content[i + 1] === '/') return undefined;
    if (char === '/' && content[i + 1] === '*') {
      const end = findBlockCommentEnd(content, i);
      if (/[\r\n\u2028\u2029]/.test(content.slice(i, end))) return undefined;
      i = end;
      continue;
    }
    return char;
  }
  return undefined;
};

// The next identifier-like word after `index`, stepping over whitespace, line breaks and
// comments: `export default /* note */ function` is a declaration across all of them.
const peekNextWord = (content: string, index: number, len: number): string => {
  let i = index;
  while (i < len) {
    const char = content[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (char === '/' && content[i + 1] === '/') {
      while (i < len && !isLineTerminator(content[i])) i++;
      continue;
    }
    if (char === '/' && content[i + 1] === '*') {
      i = findBlockCommentEnd(content, i);
      continue;
    }
    break;
  }
  if (!isIdentifierChar(content[i])) return '';
  const start = i;
  while (i < len) {
    if (isIdentifierChar(content[i])) {
      i++;
    } else if (content[i] === '\\' && content[i + 1] === 'u') {
      i = skipUnicodeEscape(content, i);
    } else {
      break;
    }
  }
  return content.slice(start, i);
};

// End of a `\uXXXX` or `\u{...}` escape that starts at `start` (a backslash). The braces of
// `\u{61}` belong to the identifier, not to a block, so they must be consumed with it.
const skipUnicodeEscape = (content: string, start: number): number => {
  let i = start + 2;
  if (content[i] === '{') {
    const close = content.indexOf('}', i + 1);
    return close === -1 ? i + 1 : close + 1;
  }
  for (let digits = 0; digits < 4 && i < content.length && /[0-9a-fA-F]/.test(content[i]); digits++) i++;
  return i;
};

const setHeader = (scope: Scope, inHeader: boolean) => {
  scope.inHeader = inHeader;
  scope.headerAngles = 0;
};

const newScope = (kind: Scope['kind'], block = false): Scope => ({
  kind,
  block,
  expressionBody: false,
  control: '',
  pendingCase: false,
  caseConditionals: 0,
  pendingFunction: null,
  inHeader: false,
  headerAngles: 0,
  switchBody: false,
  pendingSwitch: false,
  inTypeAlias: false,
});

export const stripJsComments = (content: string, options: { jsx: boolean }): string => {
  const len = content.length;
  // Output chunks, joined at the end; `lastChar` is the last character written.
  const out: string[] = [];
  let lastChar: string | undefined;
  const emit = (text: string) => {
    if (text.length === 0) return;
    out.push(text);
    lastChar = text[text.length - 1];
  };
  let i = 0;

  // Bracket scopes; the bottom one is the top level of the file, a block.
  const scopes: Scope[] = [newScope('brace', true)];
  const scope = () => scopes[scopes.length - 1];
  // Lexical modes; the bottom one is code.
  const modes: Mode[] = [{ kind: 'code' }];

  // Whether the next token is in expression position, where `/` starts a regex and `<` may
  // start JSX; and whether it starts a statement.
  let exprAllowed = true;
  let statementStart = true;
  // The previous token, the one before it, whether a line terminator came since the
  // previous one, and whether the previous token started a statement.
  let prev = '';
  let prev2 = '';
  let newlineSincePrev = false;
  let prevStartedStatement = false;
  // Whether the previous token was a regex literal. Its closing `/` takes identifier
  // characters as flags, so removing a comment right after it must leave a separator.
  let prevWasRegex = false;

  const emitToken = (value: string, nextExprAllowed: boolean, nextStatementStart = false) => {
    prevWasRegex = value === '<regex>';
    prev2 = prev;
    prev = value;
    prevStartedStatement = statementStart;
    newlineSincePrev = false;
    exprAllowed = nextExprAllowed;
    statementStart = nextStatementStart;
  };

  // A `{` in code: a block or an object literal (or type literal).
  const openBrace = () => {
    const current = scope();
    let block: boolean;
    if (statementStart || prev === ')' || BLOCK_KEYWORDS.has(prev)) {
      // Includes a class static block (`static {`); an object key `static` is followed by `:`.
      block = true;
    } else if (current.inHeader && current.headerAngles > 0) {
      block = false;
    } else if (prev === '=>') {
      block = true;
    } else if ((prev === '>' || prev === '>>' || prev === '>>>') && current.inHeader) {
      // `class A extends B<C> {`, `interface I extends J<K<L>> {`, `(): Promise<T> {`.
      block = true;
    } else if ((prev === 'return' || prev === 'yield') && newlineSincePrev) {
      // Automatic semicolon insertion ends the `return`.
      block = true;
    } else if (exprAllowed || DECLARATION_KEYWORDS.has(prev)) {
      block = false;
    } else {
      // After an identifier, a literal, `]` or `}`: in valid code this is a declaration body
      // (`class A {`, `interface I extends J {`, `enum E {`, `module 'm' {`, `): T {`).
      block = true;
    }
    const opened = newScope('brace', block);
    // A `{` that follows the `)` of `switch (...)` is the only scope where `case` and
    // `default` are clauses rather than object keys.
    opened.switchBody = current.pendingSwitch;
    current.pendingSwitch = false;
    if (block && current.pendingFunction) {
      opened.expressionBody = current.pendingFunction.expression;
      current.pendingFunction = null;
    }
    if (block) setHeader(current, false);
    scopes.push(opened);
    emitToken('{', true, block);
  };

  const closeBrace = () => {
    const closed = scopes.length > 1 ? (scopes.pop() as Scope) : scope();
    if (closed.closes === 'template') {
      // The template literal continues.
      modes.pop();
      return;
    }
    if (closed.closes === 'jsx') {
      modes.pop();
      return;
    }
    const statementEnd = closed.block && !closed.expressionBody;
    emitToken('}', statementEnd, statementEnd && isStatementScope());
  };

  const isStatementScope = () => scope().kind === 'brace' && scope().block;

  const handleWord = (word: string) => {
    const member = prev === '.' || prev === '?.';
    const current = scope();
    if (member) {
      emitToken(word, false);
      return;
    }
    if (newlineSincePrev && !exprAllowed && !CONTINUING_WORDS.has(word) && isStatementScope()) {
      // Two words cannot be adjacent in an expression, so a line break between them ends the
      // statement (automatic semicolon insertion): `a = b` then `label: {` on the next line.
      statementStart = true;
      current.inTypeAlias = false;
    }
    if (word === 'type' && statementStart && isIdentifierChar(peekSameLine(content, i))) {
      current.inTypeAlias = true;
    }
    // Keeps the start of the statement for the declaration that follows a modifier
    // (`export default function`, `declare const`, `abstract class`).
    const keepStatement = () => {
      prev2 = prev;
      prev = word;
      newlineSincePrev = false;
      exprAllowed = false;
    };
    if (word === 'export') {
      // Always a modifier: `export default <expression>` is decided at `default`.
      keepStatement();
      return;
    }
    if (word === 'default' && prev === 'export') {
      // `export default function`/`class`/`async function` is a declaration even when comments
      // or line breaks separate the words; anything else after `default` is an expression.
      const after = peekNextWord(content, i, len);
      if (after === 'function' || after === 'class' || after === 'async') {
        keepStatement();
        return;
      }
    }
    if (statementStart && MODIFIERS.has(word)) {
      const after = peekSignificantSameLine(content, i);
      if (isIdentifierChar(after) || (word === 'async' && after === '(')) {
        keepStatement();
        return;
      }
    }
    if (word === 'async' && exprAllowed && isIdentifierChar(peekSignificantSameLine(content, i))) {
      // `x = async function`: `async` does not end the expression position.
      prev2 = prev;
      prev = word;
      newlineSincePrev = false;
      return;
    }
    if (word === 'function' || word === 'class') {
      current.pendingFunction = { expression: exprAllowed && !statementStart };
    }
    // A contextual declaration keyword only starts a header where a declaration can appear;
    // as an ordinary identifier (`module > {`) it must not turn the object into a body.
    if (
      RESERVED_HEADER_KEYWORDS.has(word) ||
      (DECLARATION_HEADER_KEYWORDS.has(word) &&
        (statementStart || MODIFIERS.has(prev) || DECLARATION_KEYWORDS.has(prev))) ||
      (word === 'extends' && !current.inHeader)
    ) {
      setHeader(current, true);
    }
    if (word === 'case' && current.switchBody) {
      current.pendingCase = true;
      current.caseConditionals = 0;
    }
    const statementKeyword = STATEMENT_KEYWORDS.has(word) && isStatementScope();
    let next = EXPRESSION_KEYWORDS.has(word) || statementKeyword;
    if (word === 'default') {
      // `default:` is a clause only in a switch body; `export default` is handled above, and
      // an object key named `default` must not change state.
      if (current.switchBody && peekSameLine(content, i) === ':') current.pendingCase = true;
    }
    if (word === 'of') {
      next =
        current.kind === 'paren' &&
        current.control === 'for' &&
        // `of` follows the end of an assignment target: a name, a private name, `]`, `}` or a
        // parenthesized target `(x)`.
        (isIdentifierChar(prev[0]) || prev[0] === '#' || prev === ']' || prev === '}' || prev === ')') &&
        !DECLARATION_KEYWORDS.has(prev) &&
        prev !== 'await' &&
        prev !== 'of:keyword';
      if (next) {
        emitToken('of:keyword', true);
        return;
      }
    }
    // A statement may follow `else`, `do` and the keyword-only statements; a `{` after them
    // (and after `try`, `finally`, `catch` and a class's `static`) is a block, handled above.
    const startsStatement = word === 'else' || word === 'do' || statementKeyword;
    emitToken(word, next || startsStatement, startsStatement);
  };

  const handlePunctuator = (p: string) => {
    const current = scope();
    switch (p) {
      case '(': {
        const member = prev2 === '.' || prev2 === '?.';
        const opened = newScope('paren');
        if (!member && CONTROL_KEYWORDS.has(prev)) opened.control = prev;
        else if (prev === 'await' && prev2 === 'for') opened.control = 'for';
        scopes.push(opened);
        emitToken('(', true);
        return;
      }
      case ')': {
        const closed = current.kind === 'paren' && scopes.length > 1 ? (scopes.pop() as Scope) : null;
        const control = closed !== null && closed.control !== '';
        // Remember that the next `{` is a switch body, where `case` and `default` are clauses.
        if (closed !== null && closed.control === 'switch') scope().pendingSwitch = true;
        emitToken(')', control, control);
        return;
      }
      case '[':
        scopes.push(newScope('bracket'));
        emitToken('[', true);
        return;
      case ']':
        if (current.kind === 'bracket' && scopes.length > 1) scopes.pop();
        emitToken(']', false);
        return;
      case ';':
        setHeader(current, false);
        current.inTypeAlias = false;
        current.pendingFunction = null;
        current.pendingCase = false;
        emitToken(';', true, isStatementScope());
        return;
      case ':': {
        if (current.pendingCase && current.caseConditionals > 0) {
          // The `:` of a conditional expression in the `case` expression.
          current.caseConditionals--;
          emitToken(':', true);
          return;
        }
        if (current.pendingCase) {
          current.pendingCase = false;
          emitToken('case:', true, true);
          return;
        }
        if (isIdentifierChar(prev[0]) && prevStartedStatement && isStatementScope()) {
          emitToken('label:', true, true);
          return;
        }
        // A return type annotation (`(): Promise<T> {`).
        if (prev === ')' && !current.inHeader) setHeader(current, true);
        emitToken(':', true);
        return;
      }
      case '?':
        if (current.pendingCase) current.caseConditionals++;
        emitToken('?', true);
        return;
      case '++':
      case '--':
        // Prefix when an expression may start here or a line break precedes it (automatic
        // semicolon insertion); otherwise postfix, which ends an expression.
        emitToken(p, exprAllowed || newlineSincePrev);
        return;
      case '!':
        // TypeScript's non-null assertion (`value!`) is postfix and needs the same line.
        emitToken('!', exprAllowed || newlineSincePrev);
        return;
      case '<':
      case '>':
      case '>>':
      case '>>>':
        if (current.inHeader) {
          current.headerAngles = Math.max(0, current.headerAngles + (p === '<' ? 1 : -p.length));
        }
        emitToken(p, true);
        return;
      default:
        emitToken(p, true);
    }
  };

  // Reads one code token at `i` (whitespace and comments included).
  const scanCode = () => {
    const char = content[i];
    const next = content[i + 1];

    if (char === '/' && next === '/') {
      while (i < len && !isLineTerminator(content[i])) i++;
      return;
    }
    if (char === '/' && next === '*') {
      const end = findBlockCommentEnd(content, i);
      const kept = newlinesOf(content.slice(i, end));
      if (kept) {
        newlineSincePrev = true;
        emit(kept);
      } else if (
        wouldJoin(lastChar, content[end]) ||
        // A regex with no flags ends in `/`, and identifier characters right after it would
        // be read as flags: `/x/` plus `instanceof` becomes `/x/instanceof`.
        (prevWasRegex && lastChar === '/' && isIdentifierChar(content[end]))
      ) {
        emit(' ');
      }
      i = end;
      return;
    }
    if (/\s/.test(char)) {
      if (isLineTerminator(char)) newlineSincePrev = true;
      emit(char);
      i++;
      return;
    }

    const top = modes[modes.length - 1];
    if (top.kind === 'typeArgs' && scope() === typeArgsScope.get(top)) {
      if (char === '<') {
        top.depth++;
        emit(char);
        i++;
        emitToken('<', true);
        return;
      }
      if (char === '>') {
        top.depth--;
        emit(char);
        i++;
        emitToken('>', true);
        if (top.depth === 0) modes.pop();
        return;
      }
    }

    if (char === '/' && !exprAllowed && newlineSincePrev && scope().inTypeAlias) {
      // A type cannot continue with `/`, so the alias ended at the line break.
      scope().inTypeAlias = false;
      exprAllowed = true;
      statementStart = true;
    }
    if (char === '/' && next === '=' && newlineSincePrev && (prev === '++' || prev === '--') && !exprAllowed) {
      // `x++` cannot be assigned to, so `/=` cannot continue it: the statement ended at the
      // line break and `/=` starts a regex.
      exprAllowed = true;
    }
    if (char === '/' && exprAllowed) {
      const end = skipRegex(content, i);
      if (end !== -1) {
        emit(content.slice(i, end));
        i = end;
        emitToken('<regex>', false);
        return;
      }
    }
    if (char === '"' || char === "'") {
      const end = skipQuoted(content, i, true);
      emit(content.slice(i, end));
      i = end;
      emitToken('<string>', false);
      return;
    }
    if (char === '`') {
      emit(char);
      i++;
      modes.push({ kind: 'template' });
      return;
    }
    if (char === '<' && options.jsx && exprAllowed && looksLikeJsx(content, i)) {
      modes.push({ kind: 'jsx', depth: 0, inTag: false, closing: false });
      return;
    }
    if (char === '{') {
      emit(char);
      i++;
      openBrace();
      return;
    }
    if (char === '}') {
      emit(char);
      i++;
      closeBrace();
      return;
    }
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(next ?? ''))) {
      NUMBER.lastIndex = i;
      const match = NUMBER.exec(content);
      const end = match ? i + match[0].length : i + 1;
      emit(content.slice(i, end));
      i = end;
      emitToken('<number>', false);
      return;
    }
    if (isIdentifierChar(char) || (char === '#' && isIdentifierChar(next)) || (char === '\\' && next === 'u')) {
      // Consume complete Unicode escapes (`\u{61}`, `\u0061`) as part of the identifier. The
      // braces of `\u{61}` must not be read as a block, or the closing brace would enable a
      // regex at the following division slash.
      let end = char === '\\' ? skipUnicodeEscape(content, i) : i + 1;
      while (end < len) {
        if (isIdentifierChar(content[end])) {
          end++;
        } else if (content[end] === '\\' && content[end + 1] === 'u') {
          end = skipUnicodeEscape(content, end);
        } else {
          break;
        }
      }
      const word = content.slice(i, end);
      emit(word);
      i = end;
      handleWord(word);
      return;
    }
    // `?.` before a digit is `?` and a number (`a?.5:b`).
    let p = PUNCTUATORS.find((candidate) => content.startsWith(candidate, i)) ?? char;
    if (p === '?.' && /[0-9]/.test(content[i + 2] ?? '')) p = '?';
    emit(p);
    i += p.length;
    handlePunctuator(p);
  };

  // The scope that was on top when a JSX tag's type arguments started.
  const typeArgsScope = new WeakMap<Mode, Scope>();

  // A hashbang line is kept as is.
  if (content.startsWith('#!')) {
    while (i < len && !isLineTerminator(content[i])) i++;
    emit(content.slice(0, i));
  }

  while (i < len) {
    const mode = modes[modes.length - 1];
    const char = content[i];
    const next = content[i + 1];

    if (mode.kind === 'template') {
      if (char === '\\') {
        emit(content.slice(i, i + 2));
        i += 2;
      } else if (char === '`') {
        emit(char);
        i++;
        modes.pop();
        emitToken('<template>', false);
      } else if (char === '$' && next === '{') {
        emit('${');
        i += 2;
        const opened = newScope('brace');
        opened.closes = 'template';
        scopes.push(opened);
        modes.push({ kind: 'code' });
        emitToken('${', true);
      } else {
        emit(char);
        i++;
      }
      continue;
    }

    if (mode.kind === 'jsx') {
      if (!mode.inTag) {
        // JSX children: text, `{expression}` and nested elements. `//` and `/*` here are text.
        if (char === '{') {
          emit(char);
          i++;
          const opened = newScope('brace');
          opened.closes = 'jsx';
          scopes.push(opened);
          modes.push({ kind: 'code' });
          emitToken('{', true);
        } else if (char === '<') {
          mode.inTag = true;
          if (next === '/') {
            mode.closing = true;
            emit('</');
            i += 2;
          } else {
            mode.depth++;
            emit(char);
            i++;
          }
        } else {
          emit(char);
          i++;
        }
        continue;
      }

      // Inside a tag: attribute strings, `{expression}`, comments, type arguments, `/>`, `>`.
      if (char === '"' || char === "'") {
        const end = skipQuoted(content, i, false);
        emit(content.slice(i, end));
        i = end;
      } else if (char === '{') {
        emit(char);
        i++;
        const opened = newScope('brace');
        opened.closes = 'jsx';
        scopes.push(opened);
        modes.push({ kind: 'code' });
        emitToken('{', true);
      } else if (char === '/' && next === '/') {
        while (i < len && !isLineTerminator(content[i])) i++;
      } else if (char === '/' && next === '*') {
        const end = findBlockCommentEnd(content, i);
        emit(newlinesOf(content.slice(i, end)) || ' ');
        i = end;
      } else if (char === '<' && !mode.closing) {
        // Type arguments of the tag (`<List<Item>>`), scanned as TypeScript code.
        emit(char);
        i++;
        const args: Mode = { kind: 'typeArgs', depth: 1 };
        typeArgsScope.set(args, scope());
        modes.push(args);
        emitToken('<', true);
      } else if (char === '/' && next === '>') {
        emit('/>');
        i += 2;
        mode.inTag = false;
        mode.depth--;
      } else if (char === '>') {
        emit(char);
        i++;
        mode.inTag = false;
        if (mode.closing) {
          mode.closing = false;
          mode.depth--;
        }
      } else {
        emit(char);
        i++;
      }
      if (!mode.inTag && mode.depth <= 0) {
        modes.pop();
        emitToken('<jsx>', false);
      }
      continue;
    }

    scanCode();
  }

  return out.join('');
};
