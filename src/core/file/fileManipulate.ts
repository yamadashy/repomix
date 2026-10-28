import path from 'node:path';
import strip from '@repomix/strip-comments';

export interface FileManipulator {
  removeComments(content: string): string;
  removeEmptyLines(content: string): string;
}

const rtrimLines = (content: string): string =>
  content
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

class BaseManipulator implements FileManipulator {
  removeComments(content: string): string {
    return content;
  }

  removeEmptyLines(content: string): string {
    return content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
  }
}

class StripCommentsManipulator extends BaseManipulator {
  private language: string;

  constructor(language: string) {
    super();
    this.language = language;
  }

  removeComments(content: string): string {
    const result = strip(content, {
      language: this.language,
      preserveNewlines: true,
    });
    return rtrimLines(result);
  }
}

// CSS has no `//` line comments, but its strip profile is the JavaScript one, so a bare
// `//` — most often an unquoted `url(http://...)` — was cut as a comment together with the
// rest of the line. Strip block comments only.
const stripCssComments = (content: string): string =>
  strip.block(content, {
    language: 'css',
    preserveNewlines: true,
  });

// Scans block comments, quoted strings and unquoted `url(...)` calls in source order; only the
// last are masked. Consuming block comments first means a `url(` mentioned inside one cannot
// swallow the comment's `*/` and take the code after it along, while a real URL may still
// contain `*/`. The `\s` in the lookahead stops `\s*` from backtracking into a quoted
// `url( "...")`, whose body the strip profile already treats as a string. An unclosed `/*`
// runs to the end of input, so the scan stays linear instead of re-searching from every `/*`.
const CSS_URL_SCAN = /\/\*[\s\S]*?(?:\*\/|$)|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|url\(\s*(?!['"\s])[^)\n]*\)/gi;

// SCSS, Sass and Less do have `//` line comments, so block-only stripping is not an option,
// but their strip profile cuts at the `//` of an unquoted `url(http://...)` or `url(//cdn...)`.
// Mask those calls with placeholders made only of word characters (never read as a comment
// or a string), strip, then restore. The marker is grown until it does not occur in the
// content, so every marker seen afterwards is one of ours.
const stripCssPreprocessorComments = (content: string): string => {
  let marker = '__REPOMIX_URL_';
  while (content.includes(marker)) {
    marker += '_';
  }
  const urls: string[] = [];
  const masked = content.replace(CSS_URL_SCAN, (match) =>
    /^url\(/i.test(match) ? `${marker}${urls.push(match) - 1}__` : match,
  );
  // `sass` and `less` are the same JavaScript-based profile in strip-comments.
  const stripped = strip(masked, {
    language: 'sass',
    preserveNewlines: true,
  });
  // A placeholder inside a removed comment is simply gone; the rest are put back.
  return stripped.replace(
    new RegExp(`${marker}(\\d+)__`, 'g'),
    (placeholder, index) => urls[Number(index)] ?? placeholder,
  );
};

class CssManipulator extends BaseManipulator {
  removeComments(content: string): string {
    return rtrimLines(stripCssComments(content));
  }
}

class CssPreprocessorManipulator extends BaseManipulator {
  removeComments(content: string): string {
    return rtrimLines(stripCssPreprocessorComments(content));
  }
}

// Matches a shell heredoc opener (`<<EOF`, `<<-EOF`, `<<'EOF'`, `<<"EOF"`), excluding the
// `<<<` herestring operator via the lookaround guards.
const HEREDOC_START = /(?<!<)<<(?!<)(-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/;
// Matches a YAML block scalar opener (`key: |`, `- >-`, etc.) — the `|`/`>` indicator must
// sit at a value position (right after a `:` or `-` introducer) and be the last non-comment
// token on the line, so a plain scalar that merely ends in `|`/`>` isn't mistaken for one.
const YAML_BLOCK_SCALAR_START = /[:-]\s+[|>][+-]?\d*\s*(#.*)?$/;

// Shell and YAML use `#` line comments, but a `#` is only a comment at the start of a
// line or after whitespace — never inside `${x#y}`, `$#`, `a/b#c`, or a quoted string.
// The generic `perl` profile treats every unquoted `#` as a comment, silently corrupting
// these files (e.g. `${name##*/}` -> `${name`), so strip them with a boundary-aware scan.
// Shell heredoc bodies and YAML block-scalar bodies are literal content, not comments —
// tracked separately per line since they're line/indentation-based, not character-based.
class HashCommentManipulator extends BaseManipulator {
  private language: 'shell' | 'yaml';

  constructor(language: 'shell' | 'yaml') {
    super();
    this.language = language;
  }

  removeComments(content: string): string {
    const lines = content.split('\n');
    const output: string[] = [];
    let inSingle = false;
    let inDouble = false;
    let heredocDelimiter: string | null = null;
    let heredocStripLeadingTabs = false;
    let blockScalarIndent: number | null = null;

    for (const line of lines) {
      if (heredocDelimiter !== null) {
        output.push(line);
        const compareLine = heredocStripLeadingTabs ? line.replace(/^\t+/, '') : line;
        if (compareLine === heredocDelimiter) heredocDelimiter = null;
        continue;
      }

      if (blockScalarIndent !== null) {
        const indent = line.match(/^[ \t]*/)?.[0].length ?? 0;
        if (line.trim() !== '' && indent <= blockScalarIndent) {
          blockScalarIndent = null;
          // Not a body line — fall through and process it normally below.
        } else {
          output.push(line);
          continue;
        }
      }

      const processed = this.stripLineComment(line, inSingle, inDouble);
      inSingle = processed.inSingle;
      inDouble = processed.inDouble;
      output.push(processed.text);

      if (this.language === 'shell' && !inSingle && !inDouble) {
        const match = line.match(HEREDOC_START);
        if (match) {
          heredocStripLeadingTabs = match[1] === '-';
          heredocDelimiter = match[3];
        }
      } else if (this.language === 'yaml' && !inSingle && !inDouble && YAML_BLOCK_SCALAR_START.test(processed.text)) {
        blockScalarIndent = line.match(/^[ \t]*/)?.[0].length ?? 0;
      }
    }

    return rtrimLines(output.join('\n'));
  }

  // Strips a trailing `#` comment from a single line, carrying quote state across lines
  // (shell/YAML both allow quoted strings to span multiple lines).
  private stripLineComment(line: string, inSingleIn: boolean, inDoubleIn: boolean) {
    let result = '';
    let inSingle = inSingleIn;
    let inDouble = inDoubleIn;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inSingle) {
        result += char;
        if (char === "'") inSingle = false;
        continue;
      }
      if (inDouble) {
        if (char === '\\' && i + 1 < line.length) {
          result += char + line[i + 1];
          i++;
        } else {
          result += char;
          if (char === '"') inDouble = false;
        }
        continue;
      }

      if (char === '\\' && i + 1 < line.length) {
        result += char + line[i + 1];
        i++;
        continue;
      }
      if (char === "'" || char === '"') {
        // Shell opens a quoted string on any unescaped quote. YAML only starts a quoted
        // scalar when the quote sits at a value boundary — an apostrophe inside a plain
        // scalar (`note: it's fine  # x`) is literal and must not swallow the comment.
        const opensString = this.language === 'shell' || i === 0 || ' \t:-,[{'.includes(line[i - 1]);
        if (opensString) {
          if (char === "'") inSingle = true;
          else inDouble = true;
        }
        result += char;
        continue;
      }

      if (char === '#') {
        const prev = line[i - 1];
        if (i === 0 || prev === ' ' || prev === '\t') {
          // Rest of the line is a comment — drop it.
          break;
        }
      }

      result += char;
    }

    return { text: result, inSingle, inDouble };
  }
}

// Matches, in source order, either an HTML comment or a `<script>`/`<style>` element.
// Comments are matched too so a commented-out `<script>` stays part of the markup. The
// tag name must end at whitespace, `/` or `>` so `<style-preview>` is not a style block. The
// opening tag's attributes may contain a quoted `>` (e.g. Vue's `generic="T extends Foo<T>"`),
// and a self-closing `<script ... />` is rejected by the lookbehind since it has no body.
const SFC_SECTION =
  /<!--[\s\S]*?-->|<(script|style)(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*)(?<!\/)>([\s\S]*?)(<\/\1\s*>)/gi;
const STYLE_LANG_ATTR = /\blang\s*=\s*["']?([\w-]+)/i;

// Vue and Svelte single-file components mix three languages. Running each language's
// stripper over the whole file let the JavaScript one cut every `//` in the markup
// (`Visit http://example.com`, `<img src=http://...>`) and in `<style>`, so strip each
// section with its own language instead: script bodies as JavaScript, style bodies as CSS
// (or SCSS/Sass/Less per `lang`), and the markup around them for HTML comments only.
// Opening and closing tags are copied through untouched.
class SfcManipulator extends BaseManipulator {
  removeComments(content: string): string {
    let result = '';
    let markupStart = 0;

    for (const match of content.matchAll(SFC_SECTION)) {
      const [section, tagName, attributes, body, closeTag] = match;
      if (tagName === undefined) continue; // An HTML comment, stripped with the markup.

      const openTag = section.slice(0, section.length - body.length - closeTag.length);
      result += this.stripMarkup(content.slice(markupStart, match.index));
      result += openTag + this.stripSection(tagName.toLowerCase(), attributes, body) + closeTag;
      markupStart = match.index + section.length;
    }
    result += this.stripMarkup(content.slice(markupStart));

    // Trim once at the end; trimming each section would also drop the indentation that
    // precedes a closing tag on its own line.
    return rtrimLines(result);
  }

  private stripMarkup(markup: string): string {
    return strip(markup, { language: 'html', preserveNewlines: true });
  }

  private stripSection(tagName: string, attributes: string, body: string): string {
    if (tagName === 'script') {
      return strip(body, { language: 'javascript', preserveNewlines: true });
    }
    const lang = attributes.match(STYLE_LANG_ATTR)?.[1].toLowerCase();
    if (lang === 'scss' || lang === 'sass' || lang === 'less') {
      return stripCssPreprocessorComments(body);
    }
    return stripCssComments(body);
  }
}

const manipulators: Record<string, FileManipulator> = {
  '.c': new StripCommentsManipulator('c'),
  '.h': new StripCommentsManipulator('c'),
  '.hpp': new StripCommentsManipulator('cpp'),
  '.cpp': new StripCommentsManipulator('cpp'),
  '.cc': new StripCommentsManipulator('cpp'),
  '.cxx': new StripCommentsManipulator('cpp'),
  '.cs': new StripCommentsManipulator('csharp'),
  '.css': new CssManipulator(),
  '.dart': new StripCommentsManipulator('c'),
  '.go': new StripCommentsManipulator('go'),
  '.html': new StripCommentsManipulator('html'),
  '.java': new StripCommentsManipulator('java'),
  '.js': new StripCommentsManipulator('javascript'),
  '.jsx': new StripCommentsManipulator('javascript'),
  '.mjs': new StripCommentsManipulator('javascript'),
  '.cjs': new StripCommentsManipulator('javascript'),
  '.mjsx': new StripCommentsManipulator('javascript'),
  '.kt': new StripCommentsManipulator('c'),
  '.less': new CssPreprocessorManipulator(),
  '.php': new StripCommentsManipulator('php'),
  '.py': new StripCommentsManipulator('python'),
  '.rb': new StripCommentsManipulator('ruby'),
  '.rs': new StripCommentsManipulator('c'),
  '.sass': new CssPreprocessorManipulator(),
  '.scss': new CssPreprocessorManipulator(),
  '.sh': new HashCommentManipulator('shell'),
  '.sol': new StripCommentsManipulator('c'),
  '.sql': new StripCommentsManipulator('sql'),
  '.swift': new StripCommentsManipulator('swift'),
  '.ts': new StripCommentsManipulator('javascript'),
  '.tsx': new StripCommentsManipulator('javascript'),
  '.mts': new StripCommentsManipulator('javascript'),
  '.cts': new StripCommentsManipulator('javascript'),
  '.mtsx': new StripCommentsManipulator('javascript'),
  '.xml': new StripCommentsManipulator('xml'),
  '.yaml': new HashCommentManipulator('yaml'),
  '.yml': new HashCommentManipulator('yaml'),

  '.vue': new SfcManipulator(),
  '.svelte': new SfcManipulator(),
};

export const getFileManipulator = (filePath: string): FileManipulator | null => {
  // Match extensions case-insensitively so files with uppercase extensions
  // (e.g. `Main.JS`, `style.CSS`, `App.PY`) still get their comments and empty
  // lines stripped. This mirrors the lowercasing already done for tree-sitter
  // language detection in languageParser.ts.
  const ext = path.extname(filePath).toLowerCase();
  return manipulators[ext] || null;
};
