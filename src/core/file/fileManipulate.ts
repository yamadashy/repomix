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

// Shell and YAML use `#` line comments, but a `#` is only a comment at the start of a
// line or after whitespace — never inside `${x#y}`, `$#`, `a/b#c`, or a quoted string.
// The generic `perl` profile treats every unquoted `#` as a comment, silently corrupting
// these files (e.g. `${name##*/}` -> `${name`), so strip them with a boundary-aware scan.
class HashCommentManipulator extends BaseManipulator {
  removeComments(content: string): string {
    let result = '';
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (inSingle) {
        result += char;
        if (char === "'") inSingle = false;
        continue;
      }
      if (inDouble) {
        if (char === '\\' && i + 1 < content.length) {
          result += char + content[i + 1];
          i++;
        } else {
          result += char;
          if (char === '"') inDouble = false;
        }
        continue;
      }

      if (char === '\\' && i + 1 < content.length) {
        result += char + content[i + 1];
        i++;
        continue;
      }
      if (char === "'") {
        inSingle = true;
        result += char;
        continue;
      }
      if (char === '"') {
        inDouble = true;
        result += char;
        continue;
      }

      if (char === '#') {
        const prev = content[i - 1];
        if (i === 0 || prev === ' ' || prev === '\t' || prev === '\n' || prev === '\r') {
          // Drop the comment through end of line; the newline is preserved by the loop.
          let j = i;
          while (j < content.length && content[j] !== '\n') j++;
          i = j - 1;
          continue;
        }
      }

      result += char;
    }

    return rtrimLines(result);
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
  '.sh': new HashCommentManipulator(),
  '.sol': new StripCommentsManipulator('c'),
  '.sql': new StripCommentsManipulator('sql'),
  '.swift': new StripCommentsManipulator('swift'),
  '.ts': new StripCommentsManipulator('javascript'),
  '.tsx': new StripCommentsManipulator('javascript'),
  '.mts': new StripCommentsManipulator('javascript'),
  '.cts': new StripCommentsManipulator('javascript'),
  '.mtsx': new StripCommentsManipulator('javascript'),
  '.xml': new StripCommentsManipulator('xml'),
  '.yaml': new HashCommentManipulator(),
  '.yml': new HashCommentManipulator(),

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
