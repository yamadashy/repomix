/**
 * Shared utilities for output style generation.
 */
import Handlebars from 'handlebars';

/**
 * Map of file extensions to syntax highlighting language names.
 * Based on GitHub Linguist: https://github.com/github-linguist/linguist
 */
const extensionToLanguageMap: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'typescript',

  // Web frameworks
  vue: 'vue',
  svelte: 'svelte',
  astro: 'astro',

  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',

  // Ruby
  rb: 'ruby',
  erb: 'erb',

  // Java/JVM
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',
  clj: 'clojure',
  cljs: 'clojure',
  cljc: 'clojure',

  // C/C++/Objective-C
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  m: 'objectivec',
  mm: 'objectivec',

  // C#/F#/.NET
  cs: 'csharp',
  fs: 'fsharp',
  fsx: 'fsharp',
  fsi: 'fsharp',
  vb: 'vb',
  cshtml: 'razor',
  razor: 'razor',

  // Go
  go: 'go',

  // Rust
  rs: 'rust',

  // Swift
  swift: 'swift',

  // PHP
  php: 'php',

  // Dart/Flutter
  dart: 'dart',

  // Ruby templates
  haml: 'haml',
  slim: 'slim',

  // Functional languages
  hs: 'haskell',
  lhs: 'haskell',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hrl: 'erlang',
  ml: 'ocaml',
  mli: 'ocaml',
  elm: 'elm',

  // Other languages
  r: 'r',
  R: 'r',
  jl: 'julia',
  nim: 'nim',
  zig: 'zig',
  v: 'v',
  lua: 'lua',
  pl: 'perl',
  pm: 'perl',
  raku: 'raku',

  // Shell/Scripts
  sh: 'bash',
  bash: 'bash',
  zsh: 'zsh',
  fish: 'fish',
  ps1: 'powershell',
  psm1: 'powershell',
  bat: 'batch',
  cmd: 'batch',
  awk: 'awk',

  // Markup/Style
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  styl: 'stylus',

  // Data formats
  json: 'json',
  json5: 'json5',
  jsonc: 'json',
  xml: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  svg: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',

  // Documentation
  md: 'markdown',
  mdx: 'markdown',
  rst: 'rst',
  tex: 'latex',
  latex: 'latex',

  // Database
  sql: 'sql',
  prisma: 'prisma',

  // DevOps/Config
  dockerfile: 'dockerfile',
  tf: 'hcl',
  tfvars: 'hcl',
  hcl: 'hcl',
  nix: 'nix',
  nginx: 'nginx',
  apacheconf: 'apacheconf',

  // Build systems
  cmake: 'cmake',
  makefile: 'makefile',
  mk: 'makefile',

  // Graphics/Shaders
  glsl: 'glsl',
  vert: 'glsl',
  frag: 'glsl',
  wgsl: 'wgsl',
  hlsl: 'hlsl',

  // Hardware description
  vhdl: 'vhdl',
  vhd: 'vhdl',

  // Smart contracts
  sol: 'solidity',

  // Assembly
  asm: 'asm',
  s: 'asm',

  // Template engines
  hbs: 'handlebars',
  handlebars: 'handlebars',
  mustache: 'handlebars',
  ejs: 'ejs',
  jinja: 'jinja',
  jinja2: 'jinja',
  j2: 'jinja',
  liquid: 'liquid',
  njk: 'nunjucks',
  pug: 'pug',
  jade: 'pug',
  twig: 'twig',

  // API/Schema
  graphql: 'graphql',
  gql: 'graphql',
  proto: 'protobuf',

  // Other
  coffee: 'coffeescript',
  vim: 'vim',
  diff: 'diff',
  patch: 'diff',
  wasm: 'wasm',
  wat: 'wasm',
};

/**
 * Get syntax highlighting language name from file path.
 * Used for Markdown code block language hints.
 *
 * @param filePath - The file path to extract extension from
 * @returns The language name for syntax highlighting, or empty string if unknown
 */
export const getLanguageFromFilePath = (filePath: string): string => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  return extension ? extensionToLanguageMap[extension] || '' : '';
};

// Track if Handlebars helpers have been registered
let handlebarsHelpersRegistered = false;

/**
 * Register common Handlebars helpers for output generation.
 * This function is idempotent - calling it multiple times has no effect.
 */
export const registerHandlebarsHelpers = (): void => {
  if (handlebarsHelpersRegistered) {
    return;
  }

  Handlebars.registerHelper('getFileExtension', (filePath: string) => {
    return getLanguageFromFilePath(filePath);
  });

  handlebarsHelpersRegistered = true;
};
