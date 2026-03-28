import path from 'node:path';

export interface FileManipulator {
  removeComments(content: string): string;
  removeEmptyLines(content: string): string;
}

// Lazy-load @repomix/strip-comments — only needed when --remove-comments is enabled (non-default).
// This avoids importing the module (~8ms) on every run. Cached after first load.
let _strip: ((input: string, options?: { language?: string; preserveNewlines?: boolean }) => string) | undefined;

export const ensureStripCommentsLoaded = async (): Promise<void> => {
  if (!_strip) {
    const mod = await import('@repomix/strip-comments');
    _strip = mod.default;
  }
};

// Single-pass rtrimLines: scans for trailing whitespace before each newline
// without creating intermediate arrays. Avoids split/map/join overhead
// which creates 2 arrays + N strings for an N-line file.
const rtrimLines = (content: string): string => {
  const parts: string[] = [];
  let pos = 0;
  while (pos <= content.length) {
    const nlPos = content.indexOf('\n', pos);
    const lineEnd = nlPos === -1 ? content.length : nlPos;
    // Find end of non-whitespace content in this line
    let trimEnd = lineEnd;
    while (trimEnd > pos && (content.charCodeAt(trimEnd - 1) === 32 || content.charCodeAt(trimEnd - 1) === 9)) {
      trimEnd--;
    }
    parts.push(content.slice(pos, trimEnd));
    if (nlPos === -1) break;
    pos = nlPos + 1;
  }
  return parts.join('\n');
};

class BaseManipulator implements FileManipulator {
  removeComments(content: string): string {
    return content;
  }

  // Single-pass removeEmptyLines: scans for non-empty lines using indexOf
  // without creating intermediate split + filter arrays. For a 10,000-line file,
  // this avoids allocating ~40KB+ of temporary arrays on the heap.
  removeEmptyLines(content: string): string {
    const parts: string[] = [];
    let pos = 0;
    while (pos < content.length) {
      const nlPos = content.indexOf('\n', pos);
      const lineEnd = nlPos === -1 ? content.length : nlPos;
      // Check if line has any non-whitespace content
      let hasContent = false;
      for (let i = pos; i < lineEnd; i++) {
        const c = content.charCodeAt(i);
        if (c !== 32 && c !== 9 && c !== 13) {
          hasContent = true;
          break;
        }
      }
      if (hasContent) {
        parts.push(content.slice(pos, lineEnd));
      }
      if (nlPos === -1) break;
      pos = nlPos + 1;
    }
    return parts.join('\n');
  }
}

class StripCommentsManipulator extends BaseManipulator {
  private language: string;

  constructor(language: string) {
    super();
    this.language = language;
  }

  removeComments(content: string): string {
    if (!_strip) {
      throw new Error('strip-comments not loaded. Call ensureStripCommentsLoaded() first.');
    }
    const result = _strip(content, {
      language: this.language,
      preserveNewlines: true,
    });
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
  '.kt': new StripCommentsManipulator('c'),
  '.less': new StripCommentsManipulator('less'),
  '.php': new StripCommentsManipulator('php'),
  '.py': new StripCommentsManipulator('python'),
  '.rb': new StripCommentsManipulator('ruby'),
  '.rs': new StripCommentsManipulator('c'),
  '.sass': new StripCommentsManipulator('sass'),
  '.scss': new StripCommentsManipulator('sass'),
  '.sh': new StripCommentsManipulator('perl'),
  '.sol': new StripCommentsManipulator('c'),
  '.sql': new StripCommentsManipulator('sql'),
  '.swift': new StripCommentsManipulator('swift'),
  '.ts': new StripCommentsManipulator('javascript'),
  '.tsx': new StripCommentsManipulator('javascript'),
  '.xml': new StripCommentsManipulator('xml'),
  '.yaml': new StripCommentsManipulator('perl'),
  '.yml': new StripCommentsManipulator('perl'),

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
  const ext = path.extname(filePath);
  return manipulators[ext] || null;
};
