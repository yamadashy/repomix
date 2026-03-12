import { describe, expect, test } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateStatistics, generateStatisticsSection } from '../../../src/core/skill/skillStatistics.js';

describe('skillStatistics', () => {
  describe('calculateStatistics', () => {
    test('should calculate statistics by file type', () => {
      const files: ProcessedFile[] = [
        { path: 'src/index.ts', content: 'line1\nline2\nline3' },
        { path: 'src/utils.ts', content: 'line1\nline2' },
        { path: 'src/styles.css', content: 'line1' },
        { path: 'README.md', content: 'line1\nline2\nline3\nline4' },
      ];

      const lineCounts = {
        'src/index.ts': 3,
        'src/utils.ts': 2,
        'src/styles.css': 1,
        'README.md': 4,
      };

      const result = calculateStatistics(files, lineCounts);

      expect(result.totalFiles).toBe(4);
      expect(result.totalLines).toBe(10);
      expect(result.byFileType.length).toBe(3);

      const tsStats = result.byFileType.find((s) => s.extension === '.ts');
      expect(tsStats?.fileCount).toBe(2);
      expect(tsStats?.lineCount).toBe(5);
      expect(tsStats?.language).toBe('TypeScript');

      const cssStats = result.byFileType.find((s) => s.extension === '.css');
      expect(cssStats?.fileCount).toBe(1);
      expect(cssStats?.lineCount).toBe(1);
      expect(cssStats?.language).toBe('CSS');

      const mdStats = result.byFileType.find((s) => s.extension === '.md');
      expect(mdStats?.fileCount).toBe(1);
      expect(mdStats?.lineCount).toBe(4);
      expect(mdStats?.language).toBe('Markdown');
    });

    test('should return largest files sorted by line count', () => {
      const files: ProcessedFile[] = [
        { path: 'small.ts', content: 'a' },
        { path: 'large.ts', content: 'a\nb\nc\nd\ne' },
        { path: 'medium.ts', content: 'a\nb\nc' },
      ];

      const lineCounts = {
        'small.ts': 1,
        'large.ts': 5,
        'medium.ts': 3,
      };

      const result = calculateStatistics(files, lineCounts);

      expect(result.largestFiles[0].path).toBe('large.ts');
      expect(result.largestFiles[0].lines).toBe(5);
      expect(result.largestFiles[1].path).toBe('medium.ts');
      expect(result.largestFiles[2].path).toBe('small.ts');
    });

    test('should limit largest files to 10', () => {
      const files: ProcessedFile[] = Array.from({ length: 15 }, (_, i) => ({
        path: `file${i}.ts`,
        content: 'a'.repeat(i + 1),
      }));

      const lineCounts = Object.fromEntries(files.map((f, i) => [f.path, i + 1]));

      const result = calculateStatistics(files, lineCounts);

      expect(result.largestFiles.length).toBe(10);
    });

    test('should sort file types by file count', () => {
      const files: ProcessedFile[] = [
        { path: 'a.ts', content: 'a' },
        { path: 'b.ts', content: 'a' },
        { path: 'c.ts', content: 'a' },
        { path: 'x.js', content: 'a' },
        { path: 'y.css', content: 'a' },
        { path: 'z.css', content: 'a' },
      ];

      const lineCounts = Object.fromEntries(files.map((f) => [f.path, 1]));

      const result = calculateStatistics(files, lineCounts);

      expect(result.byFileType[0].extension).toBe('.ts');
      expect(result.byFileType[0].fileCount).toBe(3);
      expect(result.byFileType[1].extension).toBe('.css');
      expect(result.byFileType[1].fileCount).toBe(2);
    });

    test('should handle files without extension', () => {
      const files: ProcessedFile[] = [
        { path: 'Dockerfile', content: 'FROM node' },
        { path: 'Makefile', content: 'all:' },
      ];

      const lineCounts = {
        Dockerfile: 1,
        Makefile: 1,
      };

      const result = calculateStatistics(files, lineCounts);

      const noExtStats = result.byFileType.find((s) => s.extension === '(no ext)');
      expect(noExtStats?.fileCount).toBe(2);
      expect(noExtStats?.language).toBe('No Extension');
    });
  });

  describe('generateStatisticsSection', () => {
    test('should generate statistics markdown', () => {
      const stats = {
        totalFiles: 10,
        totalLines: 500,
        byFileType: [
          { extension: '.ts', language: 'TypeScript', fileCount: 5, lineCount: 300 },
          { extension: '.js', language: 'JavaScript', fileCount: 3, lineCount: 150 },
          { extension: '.css', language: 'CSS', fileCount: 2, lineCount: 50 },
        ],
        largestFiles: [
          { path: 'src/main.ts', lines: 200 },
          { path: 'src/utils.ts', lines: 100 },
        ],
      };

      const result = generateStatisticsSection(stats);

      expect(result).toContain('## Statistics');
      expect(result).toContain('10 files | 500 lines');
      expect(result).toContain('| Language | Files | Lines |');
      expect(result).toContain('| TypeScript | 5 | 300 |');
      expect(result).toContain('| JavaScript | 3 | 150 |');
      expect(result).toContain('| CSS | 2 | 50 |');
      expect(result).toContain('**Largest files:**');
      expect(result).toContain('`src/main.ts` (200 lines)');
      expect(result).toContain('`src/utils.ts` (100 lines)');
    });

    test('should limit file types to 10 and show "Other" row', () => {
      const stats = {
        totalFiles: 50,
        totalLines: 1000,
        byFileType: Array.from({ length: 15 }, (_, i) => ({
          extension: `.ext${i}`,
          language: `Language${i}`,
          fileCount: 5 - Math.floor(i / 3),
          lineCount: 100 - i * 5,
        })),
        largestFiles: [],
      };

      const result = generateStatisticsSection(stats);

      expect(result).toContain('| Other |');
      expect(result).not.toContain('Language14');
    });

    test('should format large numbers with locale string', () => {
      const stats = {
        totalFiles: 100,
        totalLines: 10000,
        byFileType: [{ extension: '.ts', language: 'TypeScript', fileCount: 100, lineCount: 10000 }],
        largestFiles: [{ path: 'big.ts', lines: 5000 }],
      };

      const result = generateStatisticsSection(stats);

      expect(result).toContain('10,000');
      expect(result).toContain('5,000');
    });
  });
});
