import path from 'node:path';

export interface FileManipulator {
  removeComments(content: string): string | Promise<string>;
  removeEmptyLines(content: string): string;
}

const rtrimLines = (content: string): string =>
  content
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

type StripFn = (content: string, options: { language: string; preserveNewlines: boolean }) => string;
let _stripModule: StripFn | null = null;
let _stripPromise: Promise<StripFn> | null = null;

const loadStrip = (): Promise<StripFn> => {
  if (_stripModule) return Promise.resolve(_stripModule);
  if (!_stripPromise) {
    _stripPromise = import('@repomix/strip-comments')
      .then((m) => {
        _stripModule = m.default as StripFn;
        return _stripModule;
      })
      .catch((err) => {
        _stripPromise = null;
        throw err;
      });
  }
  return _stripPromise;
};

class BaseManipulator implements FileManipulator {
  removeComments(content: string): string | Promise<string> {
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

  async removeComments(content: string): Promise<string> {
    const strip = await loadStrip();
    const result = strip(content, {
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

  async removeComments(content: string): Promise<string> {
    let result = content;
    for (const manipulator of this.manipulators) {
      result = await manipulator.removeComments(result);
    }
    return result;
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
