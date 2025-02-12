import {
  cQuery,
  cppQuery,
  csharpQuery,
  goQuery,
  javaQuery,
  javascriptQuery,
  phpQuery,
  pythonQuery,
  rubyQuery,
  rustQuery,
  swiftQuery,
  typescriptQuery,
} from './queries/index.js';

export const lang2Query = {
  javascript: javascriptQuery,
  typescript: typescriptQuery,
  c: cQuery,
  cpp: cppQuery,
  python: pythonQuery,
  rust: rustQuery,
  go: goQuery,
  c_sharp: csharpQuery,
  ruby: rubyQuery,
  java: javaQuery,
  php: phpQuery,
  swift: swiftQuery,
};

export type SupportedLang = keyof typeof lang2Query;
