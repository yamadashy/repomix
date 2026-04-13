import { describe, expect, test } from 'vitest';
import {
  generateTreeStringWithFileOffsets,
  generateTreeStringWithRootsAndFileOffsets,
} from '../../../src/core/file/fileTreeGenerate.js';
import { computeFileLineOffsets } from '../../../src/core/output/fileOffsets.js';

describe('showFileOffsets', () => {
  describe('computeFileLineOffsets', () => {
    test('extracts line offsets from XML output', () => {
      const output = [
        '<directory_structure>',
        'src/',
        '  foo.ts',
        '</directory_structure>',
        '',
        '<files>',
        "This section contains the contents of the repository's files.",
        '',
        '<file path="src/foo.ts">',
        'const x = 1;',
        '</file>',
        '',
        '<file path="src/bar.ts">',
        'const y = 2;',
        'const z = 3;',
        '</file>',
        '',
      ].join('\n');

      const offsets = computeFileLineOffsets(output, 'xml');

      expect(offsets['src/foo.ts']).toBeDefined();
      expect(offsets['src/foo.ts'].start).toBe(9); // line of <file path="src/foo.ts">
      expect(offsets['src/foo.ts'].end).toBe(11); // line of </file>

      expect(offsets['src/bar.ts']).toBeDefined();
      expect(offsets['src/bar.ts'].start).toBe(13);
      expect(offsets['src/bar.ts'].end).toBe(16);
    });

    test('extracts line offsets from Markdown output', () => {
      const output = [
        '# Directory Structure',
        '```',
        'src/',
        '  foo.ts',
        '```',
        '',
        '# Files',
        '',
        '## File: src/foo.ts',
        '```ts',
        'const x = 1;',
        '```',
        '',
        '## File: src/bar.ts',
        '```ts',
        'const y = 2;',
        '```',
        '',
      ].join('\n');

      const offsets = computeFileLineOffsets(output, 'markdown');

      expect(offsets['src/foo.ts']).toBeDefined();
      expect(offsets['src/foo.ts'].start).toBe(9); // line of "## File: src/foo.ts"
      expect(offsets['src/foo.ts'].end).toBe(13); // line before "## File: src/bar.ts"

      expect(offsets['src/bar.ts']).toBeDefined();
      expect(offsets['src/bar.ts'].start).toBe(14);
    });

    test('extracts line offsets from plain output', () => {
      const output = [
        '================================================================================',
        'Directory Structure',
        '================================================================================',
        'src/',
        '  foo.ts',
        '',
        '================================================================================',
        'Files',
        '================================================================================',
        '',
        '================', // line 11: file separator
        'File: src/foo.ts', // line 12
        '================', // line 13
        'const x = 1;', // line 14: content start
        '', // line 15
        '================', // line 16: next file separator
        'File: src/bar.ts', // line 17
        '================', // line 18
        'const y = 2;', // line 19: content start
        '', // line 20
      ].join('\n');

      const offsets = computeFileLineOffsets(output, 'plain');

      expect(offsets['src/foo.ts']).toBeDefined();
      // separator(11) + File:(12) + separator(13) → content at 14 = 11+3
      expect(offsets['src/foo.ts'].start).toBe(14);
      expect(offsets['src/bar.ts']).toBeDefined();
      // separator(16) + File:(17) + separator(18) → content at 19 = 16+3
      expect(offsets['src/bar.ts'].start).toBe(19);
    });

    test('does not pick up XML file markers outside the <files> section', () => {
      // Markers that appear before <files> (e.g. in directory_structure or header) must not
      // produce false offset entries. This is the primary false-match scenario.
      const output = [
        // Some header content that happens to look like a file marker
        '<file path="src/decoy.ts">',
        'not real content',
        '</file>',
        '',
        '<files>',
        '',
        '<file path="src/real.ts">',
        'const x = 1;',
        '</file>',
        '',
        '</files>',
      ].join('\n');

      const offsets = computeFileLineOffsets(output, 'xml');

      // Decoy outside <files> must not be captured
      expect(offsets['src/decoy.ts']).toBeUndefined();
      // Real file inside <files> must be captured
      expect(offsets['src/real.ts']).toBeDefined();
    });

    test('does not pick up Markdown ## File: headers outside the # Files section', () => {
      const output = [
        '## File: src/decoy.ts', // appears before # Files — must be ignored
        '',
        '# Files',
        '',
        '## File: src/real.ts',
        '```ts',
        'const x = 1;',
        '```',
        '',
      ].join('\n');

      const offsets = computeFileLineOffsets(output, 'markdown');

      expect(offsets['src/decoy.ts']).toBeUndefined();
      expect(offsets['src/real.ts']).toBeDefined();
      expect(offsets['src/real.ts'].start).toBe(5);
    });

    test('returns empty object for JSON style', () => {
      const output = '{"files": {}}';
      const offsets = computeFileLineOffsets(output, 'json');
      expect(offsets).toEqual({});
    });

    test('handles empty output', () => {
      const offsets = computeFileLineOffsets('', 'xml');
      expect(offsets).toEqual({});
    });
  });

  describe('generateTreeStringWithFileOffsets', () => {
    test('annotates file entries with line ranges', () => {
      const files = ['src/foo.ts', 'src/bar.ts'];
      const offsets = {
        'src/foo.ts': { start: 10, end: 20 },
        'src/bar.ts': { start: 22, end: 35 },
      };

      const tree = generateTreeStringWithFileOffsets(files, offsets);

      expect(tree).toContain('foo.ts [lines 10–20]');
      expect(tree).toContain('bar.ts [lines 22–35]');
      expect(tree).toContain('src/');
    });

    test('omits annotation when file not in offsets map', () => {
      const files = ['src/foo.ts', 'src/bar.ts'];
      const offsets = {
        'src/foo.ts': { start: 10, end: 20 },
        // src/bar.ts not in offsets
      };

      const tree = generateTreeStringWithFileOffsets(files, offsets);

      expect(tree).toContain('foo.ts [lines 10–20]');
      expect(tree).toContain('bar.ts');
      expect(tree).not.toContain('bar.ts [lines');
    });

    test('directories have no annotations', () => {
      const files = ['src/foo.ts'];
      const offsets = { 'src/foo.ts': { start: 5, end: 10 } };

      const tree = generateTreeStringWithFileOffsets(files, offsets);

      // Directory should not have annotation
      const lines = tree.split('\n');
      const srcLine = lines.find((l) => l.includes('src/'));
      expect(srcLine).toBe('src/');
    });
  });

  describe('generateTreeStringWithRootsAndFileOffsets', () => {
    test('annotates single root without labels', () => {
      const filesByRoot = [{ rootLabel: 'project', files: ['src/foo.ts'] }];
      const offsets = { 'src/foo.ts': { start: 15, end: 25 } };

      const tree = generateTreeStringWithRootsAndFileOffsets(filesByRoot, offsets);

      expect(tree).not.toContain('[project]');
      expect(tree).toContain('foo.ts [lines 15–25]');
    });

    test('annotates multiple roots with labels', () => {
      const filesByRoot = [
        { rootLabel: 'cli', files: ['cliRun.ts'] },
        { rootLabel: 'config', files: ['configLoad.ts'] },
      ];
      const offsets = {
        'cliRun.ts': { start: 10, end: 30 },
        'configLoad.ts': { start: 32, end: 50 },
      };

      const tree = generateTreeStringWithRootsAndFileOffsets(filesByRoot, offsets);

      expect(tree).toContain('[cli]/');
      expect(tree).toContain('[config]/');
      expect(tree).toContain('cliRun.ts [lines 10–30]');
      expect(tree).toContain('configLoad.ts [lines 32–50]');
    });
  });
});
