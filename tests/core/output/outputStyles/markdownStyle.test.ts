import Handlebars from 'handlebars';
import { describe, expect, test } from 'vitest';
import { getMarkdownTemplate } from '../../../../src/core/output/outputStyles/markdownStyle.js';

describe('markdownStyle', () => {
  describe('getMarkdownTemplate', () => {
    test('should return valid markdown template', () => {
      const template = getMarkdownTemplate();
      expect(template).toContain('# File Summary');
      expect(template).toContain('# Directory Structure');
      expect(template).toContain('# Files');
      expect(template).toContain('{{#if instruction}}');
      expect(template).toContain('# Instruction');
    });

    test('should correctly render template with basic data', () => {
      const template = getMarkdownTemplate();
      const compiledTemplate = Handlebars.compile(template);
      const data = {
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
        fileSummaryEnabled: true,
        directoryStructureEnabled: true,
        filesEnabled: true,
        markdownCodeBlockDelimiter: '```',
      };

      const result = compiledTemplate(data);

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
      const template = getMarkdownTemplate();
      const compiledTemplate = Handlebars.compile(template);
      const data = {
        headerText: 'Custom Header Text',
        processedFiles: [],
        fileSummaryEnabled: true,
        directoryStructureEnabled: true,
      };

      const result = compiledTemplate(data);

      expect(result).toContain('# User Provided Header');
      expect(result).toContain('Custom Header Text');
    });

    test('should not render header section when headerText is not provided', () => {
      const template = getMarkdownTemplate();
      const compiledTemplate = Handlebars.compile(template);
      const data = {
        processedFiles: [],
        fileSummaryEnabled: true,
        directoryStructureEnabled: true,
      };

      const result = compiledTemplate(data);

      expect(result).not.toContain('# User Provided Header');
    });

    test('should render instruction section when provided', () => {
      const template = getMarkdownTemplate();
      const compiledTemplate = Handlebars.compile(template);
      const data = {
        instruction: 'Custom Instruction Text',
        processedFiles: [],
        fileSummaryEnabled: true,
        directoryStructureEnabled: true,
      };

      const result = compiledTemplate(data);

      expect(result).toContain('# Instruction');
      expect(result).toContain('Custom Instruction Text');
    });

    test('should display headerText if specified even if fileSummary is disabled', () => {
      const template = getMarkdownTemplate();
      const compiledTemplate = Handlebars.compile(template);
      const data = {
        headerText: 'MARKDOWN HEADER',
        fileSummaryEnabled: false,
        directoryStructureEnabled: true,
        processedFiles: [],
      };
      const result = compiledTemplate(data);
      expect(result).not.toContain('This file is a merged representation');
      expect(result).toContain('MARKDOWN HEADER');
    });

    test('should not display generationHeader if fileSummary is disabled', () => {
      const template = getMarkdownTemplate();
      const compiledTemplate = Handlebars.compile(template);
      const data = {
        generationHeader: 'Generated Test Header',
        fileSummaryEnabled: false,
        directoryStructureEnabled: true,
        processedFiles: [],
      };
      const result = compiledTemplate(data);
      expect(result).not.toContain('This file is a merged representation');
      expect(result).not.toContain('Generated Test Header');
      expect(result).toContain('# Directory Structure');
    });
  });

  describe('getFileExtension helper', () => {
    // Helper to get extension mapping result
    const getExtension = (filePath: string): string => {
      const helper = Handlebars.helpers.getFileExtension as Handlebars.HelperDelegate;
      return helper(filePath) as string;
    };

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
  });
});
