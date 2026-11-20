import { describe, expect, test } from 'vitest';
import { getLanguageFromFilePath, renderEach } from '../../../src/core/output/outputStyleUtils.js';

describe('outputStyleUtils', () => {
  describe('renderEach', () => {
    test('should concatenate rendered items in order', () => {
      expect(renderEach(['a', 'b', 'c'], (item) => `[${item}]\n`)).toBe('[a]\n[b]\n[c]\n');
    });

    test('should return an empty string for an empty list', () => {
      expect(renderEach([], (item: string) => `[${item}]`)).toBe('');
    });

    test('should treat a missing list as empty', () => {
      expect(renderEach(undefined, (item: string) => `[${item}]`)).toBe('');
    });

    test('should insert rendered values verbatim', () => {
      expect(renderEach(['<a & "b">', '{{x}}'], (item) => item)).toBe('<a & "b">{{x}}');
    });
  });

  describe('getLanguageFromFilePath', () => {
    const getExtension = getLanguageFromFilePath;

    // JavaScript variants
    test('should handle JavaScript related extensions', () => {
      expect(getExtension('file.js')).toBe('javascript');
      expect(getExtension('file.jsx')).toBe('javascript');
      expect(getExtension('file.ts')).toBe('typescript');
      expect(getExtension('file.tsx')).toBe('typescript');
    });

    // Web technologies
    test('should handle web technology extensions', () => {
      expect(getExtension('file.html')).toBe('html');
      expect(getExtension('file.css')).toBe('css');
      expect(getExtension('file.scss')).toBe('scss');
      expect(getExtension('file.sass')).toBe('sass');
      expect(getExtension('file.vue')).toBe('vue');
    });

    // Backend languages
    test('should handle backend language extensions', () => {
      expect(getExtension('file.py')).toBe('python');
      expect(getExtension('file.rb')).toBe('ruby');
      expect(getExtension('file.php')).toBe('php');
      expect(getExtension('file.java')).toBe('java');
      expect(getExtension('file.go')).toBe('go');
    });

    // System programming languages
    test('should handle system programming language extensions', () => {
      expect(getExtension('file.c')).toBe('c');
      expect(getExtension('file.cpp')).toBe('cpp');
      expect(getExtension('file.rs')).toBe('rust');
      expect(getExtension('file.swift')).toBe('swift');
      expect(getExtension('file.kt')).toBe('kotlin');
    });

    // Configuration and data format files
    test('should handle configuration and data format extensions', () => {
      expect(getExtension('file.json')).toBe('json');
      expect(getExtension('file.json5')).toBe('json5');
      expect(getExtension('file.xml')).toBe('xml');
      expect(getExtension('file.yaml')).toBe('yaml');
      expect(getExtension('file.yml')).toBe('yaml');
      expect(getExtension('file.toml')).toBe('toml');
    });

    // Shell and scripting
    test('should handle shell and scripting extensions', () => {
      expect(getExtension('file.sh')).toBe('bash');
      expect(getExtension('file.bash')).toBe('bash');
      expect(getExtension('file.ps1')).toBe('powershell');
    });

    // Database and query languages
    test('should handle database related extensions', () => {
      expect(getExtension('file.sql')).toBe('sql');
      expect(getExtension('file.graphql')).toBe('graphql');
      expect(getExtension('file.gql')).toBe('graphql');
    });

    // Functional programming languages
    test('should handle functional programming language extensions', () => {
      expect(getExtension('file.fs')).toBe('fsharp');
      expect(getExtension('file.fsx')).toBe('fsharp');
      expect(getExtension('file.hs')).toBe('haskell');
      expect(getExtension('file.clj')).toBe('clojure');
      expect(getExtension('file.cljs')).toBe('clojure');
    });

    // Other languages and tools
    test('should handle other programming language extensions', () => {
      expect(getExtension('file.scala')).toBe('scala');
      expect(getExtension('file.dart')).toBe('dart');
      expect(getExtension('file.ex')).toBe('elixir');
      expect(getExtension('file.exs')).toBe('elixir');
      expect(getExtension('file.erl')).toBe('erlang');
      expect(getExtension('file.coffee')).toBe('coffeescript');
    });

    // Infrastructure and templating
    test('should handle infrastructure and templating extensions', () => {
      expect(getExtension('file.tf')).toBe('hcl');
      expect(getExtension('file.tfvars')).toBe('hcl');
      expect(getExtension('file.dockerfile')).toBe('dockerfile');
      expect(getExtension('file.pug')).toBe('pug');
      expect(getExtension('file.proto')).toBe('protobuf');
    });

    // Miscellaneous
    test('should handle miscellaneous file extensions', () => {
      expect(getExtension('file.md')).toBe('markdown');
      expect(getExtension('file.r')).toBe('r');
      expect(getExtension('file.pl')).toBe('perl');
      expect(getExtension('file.pm')).toBe('perl');
      expect(getExtension('file.lua')).toBe('lua');
      expect(getExtension('file.groovy')).toBe('groovy');
      expect(getExtension('file.vb')).toBe('vb');
    });

    // Edge cases
    test('should handle edge cases', () => {
      expect(getExtension('file')).toBe(''); // No extension
      expect(getExtension('.gitignore')).toBe(''); // Dotfile
      expect(getExtension('file.unknown')).toBe(''); // Unknown extension
      expect(getExtension('path/to/file.js')).toBe('javascript'); // Path with directory
    });

    // Extensionless whole-filename keys (Dockerfile, Makefile) must resolve in
    // subdirectories too, not only at the repo root.
    test('should handle extensionless filenames regardless of directory depth', () => {
      expect(getExtension('Dockerfile')).toBe('dockerfile');
      expect(getExtension('docker/Dockerfile')).toBe('dockerfile');
      expect(getExtension('services/api/Dockerfile')).toBe('dockerfile');
      expect(getExtension('Makefile')).toBe('makefile');
      expect(getExtension('src/Makefile')).toBe('makefile');
      expect(getExtension('my.dir/Dockerfile')).toBe('dockerfile'); // dot in a directory segment
      expect(getExtension('path\\to\\Dockerfile')).toBe('dockerfile'); // Windows separator
    });
  });
});
