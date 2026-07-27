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

class CompositeManipulator extends BaseManipulator {
  private manipulators: FileManipulator[];

  constructor(...manipulators: FileManipulator[]) {
    super();
    this.manipulators = manipulators;
  }

  removeComments(content: string): string {
    return this.manipulators.reduce((acc, manipulator) => manipulator.removeComments(acc), content);
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
  '.css': new StripCommentsManipulator('css'),
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
  '.less': new StripCommentsManipulator('less'),
  '.php': new StripCommentsManipulator('php'),
  '.py': new StripCommentsManipulator('python'),
  '.rb': new StripCommentsManipulator('ruby'),
  '.rs': new StripCommentsManipulator('c'),
  '.sass': new StripCommentsManipulator('sass'),
  '.scss': new StripCommentsManipulator('sass'),
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

  '.vue': new CompositeManipulator(
    new StripCommentsManipulator('html'),
    new StripCommentsManipulator('css'),
    new StripCommentsManipulator('javascript'),
  ),
  '.svelte': new CompositeManipulator(
    new StripCommentsManipulator('html'),
    new StripCommentsManipulator('css'),
    new StripCommentsManipulator('javascript'),
  ),
};

export const getFileManipulator = (filePath: string): FileManipulator | null => {
  // Match extensions case-insensitively so files with uppercase extensions
  // (e.g. `Main.JS`, `style.CSS`, `App.PY`) still get their comments and empty
  // lines stripped. This mirrors the lowercasing already done for tree-sitter
  // language detection in languageParser.ts.
  const ext = path.extname(filePath).toLowerCase();
  return manipulators[ext] || null;
};
