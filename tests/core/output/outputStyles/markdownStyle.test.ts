import { describe, expect, test } from 'vitest';
import type { RenderContext } from '../../../../src/core/output/outputGeneratorTypes.js';
import { renderMarkdown } from '../../../../src/core/output/outputStyles/markdownStyle.js';
import { getLanguageFromFilePath } from '../../../../src/core/output/outputStyleUtils.js';

const createTestContext = (overrides: Partial<RenderContext> = {}): RenderContext => ({
  generationHeader: '',
  summaryPurpose: '',
  summaryFileFormat: '',
  summaryUsageGuidelines: '',
  summaryNotes: '',
  headerText: undefined,
  instruction: '',
  treeString: '',
  processedFiles: [],
  fileLineCounts: {},
  fileSummaryEnabled: true,
  directoryStructureEnabled: true,
  filesEnabled: true,
  escapeFileContent: false,
  markdownCodeBlockDelimiter: '```',
  gitDiffEnabled: false,
  gitDiffWorkTree: undefined,
  gitDiffStaged: undefined,
  gitLogEnabled: false,
  gitLogContent: undefined,
  gitLogCommits: undefined,
  ...overrides,
});

describe('markdownStyle', () => {
  describe('renderMarkdown', () => {
    test('should return valid markdown output', () => {
      const result = renderMarkdown(createTestContext());
      expect(result).toContain('# File Summary');
      expect(result).toContain('# Directory Structure');
      expect(result).toContain('# Files');
    });

    test('should correctly render with basic data', () => {
      const ctx = createTestContext({
        generationHeader: 'Generated Test Header',
        summaryPurpose: 'Test Purpose',
        summaryFileFormat: 'Test Format',
        summaryUsageGuidelines: 'Test Guidelines',
        summaryNotes: 'Test Notes',
        treeString: 'src/\n  index.ts',
        processedFiles: [
          {
            path: 'src/index.ts',
            content: 'console.log("Hello");',
          },
        ],
      });

      const result = renderMarkdown(ctx);

      expect(result).toContain('Generated Test Header');
      expect(result).toContain('Test Purpose');
      expect(result).toContain('Test Format');
      expect(result).toContain('Test Guidelines');
      expect(result).toContain('Test Notes');
      expect(result).toContain('src/\n  index.ts');
      expect(result).toContain('## File: src/index.ts');
      expect(result).toContain('console.log("Hello");');
    });

    test('should render optional header text when provided', () => {
      const ctx = createTestContext({
        headerText: 'Custom Header Text',
      });

      const result = renderMarkdown(ctx);

      expect(result).toContain('# User Provided Header');
      expect(result).toContain('Custom Header Text');
    });

    test('should not render header section when headerText is not provided', () => {
      const ctx = createTestContext({
        headerText: undefined,
      });

      const result = renderMarkdown(ctx);

      expect(result).not.toContain('# User Provided Header');
    });

    test('should render instruction section when provided', () => {
      const ctx = createTestContext({
        instruction: 'Custom Instruction Text',
      });

      const result = renderMarkdown(ctx);

      expect(result).toContain('# Instruction');
      expect(result).toContain('Custom Instruction Text');
    });

    test('should display headerText if specified even if fileSummary is disabled', () => {
      const ctx = createTestContext({
        headerText: 'MARKDOWN HEADER',
        fileSummaryEnabled: false,
      });

      const result = renderMarkdown(ctx);
      expect(result).not.toContain('This file is a merged representation');
      expect(result).toContain('MARKDOWN HEADER');
    });

    test('should not display generationHeader if fileSummary is disabled', () => {
      const ctx = createTestContext({
        generationHeader: 'Generated Test Header',
        fileSummaryEnabled: false,
      });

      const result = renderMarkdown(ctx);
      expect(result).not.toContain('This file is a merged representation');
      expect(result).not.toContain('Generated Test Header');
      expect(result).toContain('# Directory Structure');
    });
  });

  describe('getLanguageFromFilePath', () => {
    // JavaScript variants
    test('should handle JavaScript related extensions', () => {
      expect(getLanguageFromFilePath('file.js')).toBe('javascript');
      expect(getLanguageFromFilePath('file.jsx')).toBe('javascript');
      expect(getLanguageFromFilePath('file.ts')).toBe('typescript');
      expect(getLanguageFromFilePath('file.tsx')).toBe('typescript');
    });

    // Web technologies
    test('should handle web technology extensions', () => {
      expect(getLanguageFromFilePath('file.html')).toBe('html');
      expect(getLanguageFromFilePath('file.css')).toBe('css');
      expect(getLanguageFromFilePath('file.scss')).toBe('scss');
      expect(getLanguageFromFilePath('file.sass')).toBe('sass');
      expect(getLanguageFromFilePath('file.vue')).toBe('vue');
    });

    // Backend languages
    test('should handle backend language extensions', () => {
      expect(getLanguageFromFilePath('file.py')).toBe('python');
      expect(getLanguageFromFilePath('file.rb')).toBe('ruby');
      expect(getLanguageFromFilePath('file.php')).toBe('php');
      expect(getLanguageFromFilePath('file.java')).toBe('java');
      expect(getLanguageFromFilePath('file.go')).toBe('go');
    });

    // System programming languages
    test('should handle system programming language extensions', () => {
      expect(getLanguageFromFilePath('file.c')).toBe('c');
      expect(getLanguageFromFilePath('file.cpp')).toBe('cpp');
      expect(getLanguageFromFilePath('file.rs')).toBe('rust');
      expect(getLanguageFromFilePath('file.swift')).toBe('swift');
      expect(getLanguageFromFilePath('file.kt')).toBe('kotlin');
    });

    // Configuration and data format files
    test('should handle configuration and data format extensions', () => {
      expect(getLanguageFromFilePath('file.json')).toBe('json');
      expect(getLanguageFromFilePath('file.json5')).toBe('json5');
      expect(getLanguageFromFilePath('file.xml')).toBe('xml');
      expect(getLanguageFromFilePath('file.yaml')).toBe('yaml');
      expect(getLanguageFromFilePath('file.yml')).toBe('yaml');
      expect(getLanguageFromFilePath('file.toml')).toBe('toml');
    });

    // Shell and scripting
    test('should handle shell and scripting extensions', () => {
      expect(getLanguageFromFilePath('file.sh')).toBe('bash');
      expect(getLanguageFromFilePath('file.bash')).toBe('bash');
      expect(getLanguageFromFilePath('file.ps1')).toBe('powershell');
    });

    // Database and query languages
    test('should handle database related extensions', () => {
      expect(getLanguageFromFilePath('file.sql')).toBe('sql');
      expect(getLanguageFromFilePath('file.graphql')).toBe('graphql');
      expect(getLanguageFromFilePath('file.gql')).toBe('graphql');
    });

    // Functional programming languages
    test('should handle functional programming language extensions', () => {
      expect(getLanguageFromFilePath('file.fs')).toBe('fsharp');
      expect(getLanguageFromFilePath('file.fsx')).toBe('fsharp');
      expect(getLanguageFromFilePath('file.hs')).toBe('haskell');
      expect(getLanguageFromFilePath('file.clj')).toBe('clojure');
      expect(getLanguageFromFilePath('file.cljs')).toBe('clojure');
    });

    // Other languages and tools
    test('should handle other programming language extensions', () => {
      expect(getLanguageFromFilePath('file.scala')).toBe('scala');
      expect(getLanguageFromFilePath('file.dart')).toBe('dart');
      expect(getLanguageFromFilePath('file.ex')).toBe('elixir');
      expect(getLanguageFromFilePath('file.exs')).toBe('elixir');
      expect(getLanguageFromFilePath('file.erl')).toBe('erlang');
      expect(getLanguageFromFilePath('file.coffee')).toBe('coffeescript');
    });

    // Infrastructure and templating
    test('should handle infrastructure and templating extensions', () => {
      expect(getLanguageFromFilePath('file.tf')).toBe('hcl');
      expect(getLanguageFromFilePath('file.tfvars')).toBe('hcl');
      expect(getLanguageFromFilePath('file.dockerfile')).toBe('dockerfile');
      expect(getLanguageFromFilePath('file.pug')).toBe('pug');
      expect(getLanguageFromFilePath('file.proto')).toBe('protobuf');
    });

    // Miscellaneous
    test('should handle miscellaneous file extensions', () => {
      expect(getLanguageFromFilePath('file.md')).toBe('markdown');
      expect(getLanguageFromFilePath('file.r')).toBe('r');
      expect(getLanguageFromFilePath('file.pl')).toBe('perl');
      expect(getLanguageFromFilePath('file.pm')).toBe('perl');
      expect(getLanguageFromFilePath('file.lua')).toBe('lua');
      expect(getLanguageFromFilePath('file.groovy')).toBe('groovy');
      expect(getLanguageFromFilePath('file.vb')).toBe('vb');
    });

    // Edge cases
    test('should handle edge cases', () => {
      expect(getLanguageFromFilePath('file')).toBe(''); // No extension
      expect(getLanguageFromFilePath('.gitignore')).toBe(''); // Dotfile
      expect(getLanguageFromFilePath('file.unknown')).toBe(''); // Unknown extension
      expect(getLanguageFromFilePath('path/to/file.js')).toBe('javascript'); // Path with directory
    });
  });
});
