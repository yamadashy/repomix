import c from './queries/c.js';
import c_sharp from './queries/c_sharp.js';
import cpp from './queries/cpp.js';
import go from './queries/go.js';
import java from './queries/java.js';
import javascript from './queries/javascript.js';
import php from './queries/php.js';
import python from './queries/python.js';
import ruby from './queries/ruby.js';
import rust from './queries/rust.js';
import swift from './queries/swift.js';
import typescript from './queries/typescript.js';

export const lang2Query = {
  javascript: javascript,
  typescript: typescript,
  c: c,
  cpp: cpp,
  python: python,
  rust: rust,
  go: go,
  c_sharp: c_sharp,
  ruby: ruby,
  java: java,
  php: php,
  swift: swift,
};

export type SupportedLang = keyof typeof lang2Query;
