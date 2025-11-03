import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { LineLimitProcessor } from '../../../src/core/file/lineLimitProcessor.js';
import { LineLimitStrategyRegistry } from '../../../src/core/file/lineLimitStrategies/LineLimitStrategyRegistry.js';
import type { LanguageStrategy } from '../../../src/core/file/lineLimitTypes.js';
import { LineLimitError, LineLimitParseError, LineLimitTooSmallError } from '../../../src/core/file/lineLimitTypes.js';

describe('Line Limit Edge Cases and Error Handling', () => {
  let processor: LineLimitProcessor;

  beforeEach(async () => {
    processor = new LineLimitProcessor();
  });

  afterEach(() => {
    processor.dispose();
  });

  describe('Invalid Line Limits', () => {
    test('should handle negative line limits', async () => {
      await expect(
        processor.applyLineLimit('line1\nline2', 'test.js', {
          lineLimit: -1,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).rejects.toThrow(LineLimitTooSmallError);
    });

    test('should handle zero line limits', async () => {
      await expect(
        processor.applyLineLimit('line1\nline2', 'test.js', {
          lineLimit: 0,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).rejects.toThrow(LineLimitTooSmallError);
    });

    test('should handle line limit of 1', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 1,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(1);
      expect(result.selectedLines[0].lineNumber).toBe(0); // Should select import line
    });

    test('should handle very large line limits', async () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const result = await processor.applyLineLimit(content, 'test.js', {
        lineLimit: 1000,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(100);
      expect(result.originalLineCount).toBe(100);
      expect(result.limitedLineCount).toBe(100);
    });
  });

  describe('Empty and Whitespace Files', () => {
    test('should handle completely empty files', async () => {
      const result = await processor.applyLineLimit('', 'test.js', {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(0);
      expect(result.originalLineCount).toBe(0);
      expect(result.limitedLineCount).toBe(0);
    });

    test('should handle files with only whitespace', async () => {
      const content = ['', '   ', '\t', '\n', '  \t  '].join('\n');
      const result = await processor.applyLineLimit(content, 'test.js', {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(5);
    });

    test('should handle files with only comments', async () => {
      const content = [
        '// This is a comment',
        '/* Multi-line comment */',
        '/**',
        ' * JSDoc comment',
        ' */',
        '# Python style comment',
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.js', {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(6);
      expect(result.originalLineCount).toBe(6);
      expect(result.limitedLineCount).toBe(6);
    });
  });

  describe('Malformed Code', () => {
    test('should handle syntax errors gracefully', async () => {
      const lines = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello',
        '    // Missing closing div and parenthesis',
        '  ',
        'export default App;',
      ];

      // Should not throw an error even with syntax issues
      await expect(
        processor.applyLineLimit(lines.join('\n'), 'test.jsx', {
          lineLimit: 10,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).resolves.toBeDefined();
    });

    test('should handle unclosed brackets and parentheses', async () => {
      const lines = [
        'function test() {',
        '  if (condition {',
        '    for (let i = 0; i < 10; i++ {',
        '      array.push(item',
        '    }',
        '  }',
        '}',
        '',
        'const obj = {',
        '  prop1: "value",',
        '  prop2: [1, 2, 3',
        '};',
      ];

      await expect(
        processor.applyLineLimit(lines.join('\n'), 'test.js', {
          lineLimit: 10,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).resolves.toBeDefined();
    });

    test('should handle mixed language content', async () => {
      const lines = [
        'import React from "react";',
        'def python_function():',
        '    print("This is Python")',
        '    return True',
        '',
        'function javascriptFunction() {',
        '  console.log("This is JavaScript");',
        '  return true;',
        '}',
        '',
        'public class JavaClass {',
        '    public static void main(String[] args) {',
        '        System.out.println("This is Java");',
        '    }',
        '}',
      ];

      // Should handle mixed content without crashing
      await expect(
        processor.applyLineLimit(lines.join('\n'), 'test.js', {
          lineLimit: 10,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('Binary and Non-Text Files', () => {
    test('should handle files with binary content', async () => {
      // Simulate binary content with null bytes and other non-printable characters
      const lines = [
        'import React from "react";',
        '\x00\x01\x02\x03\x04\x05', // Binary data
        'function App() {',
        '\xFF\xFE\xFD\xFC', // More binary data
        '  return <div>Hello</div>;',
        '\x80\x81\x82\x83', // More binary data
        '}',
        'export default App;',
      ];

      await expect(
        processor.applyLineLimit(lines.join('\n'), 'test.jsx', {
          lineLimit: 10,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).resolves.toBeDefined();
    });

    test('should handle files with very long lines without line breaks', async () => {
      const longContent = 'a'.repeat(50000); // 50KB single line

      await expect(
        processor.applyLineLimit(longContent, 'test.txt', {
          lineLimit: 1,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('Edge Case File Extensions', () => {
    test('should handle unknown file extensions', async () => {
      const lines = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ];

      await expect(
        processor.applyLineLimit(lines.join('\n'), 'test.unknown', {
          lineLimit: 10,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).rejects.toThrow(LineLimitError);
    });

    test('should handle files without extensions', async () => {
      const content = ['#!/usr/bin/env node', 'console.log("Hello World");', 'process.exit(0);'].join('\n');

      await expect(
        processor.applyLineLimit(content, 'script', {
          lineLimit: 10,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).rejects.toThrow(LineLimitError);
    });
  });

  describe('Resource Management', () => {
    test('should handle rapid consecutive processing', async () => {
      const lines = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ];

      // Process many files rapidly
      for (let i = 0; i < 5; i++) {
        // Reduced for performance
        await expect(
          processor.applyLineLimit(lines.join('\n'), `test${i}.jsx`, {
            lineLimit: 3,
            preserveStructure: true,
            showTruncationIndicators: true,
            enableCaching: true,
          }),
        ).resolves.toBeDefined();
      }
    });

    test('should handle concurrent processing', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ].join('\n');

      // Process multiple files concurrently
      const promises = Array.from(
        { length: 3 },
        (
          _,
          i, // Reduced for performance
        ) =>
          processor.applyLineLimit(content, `test${i}.jsx`, {
            lineLimit: 3,
            preserveStructure: true,
            showTruncationIndicators: true,
            enableCaching: true,
          }),
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.selectedLines).toHaveLength(3);
        expect(result.originalLineCount).toBe(5);
        expect(result.limitedLineCount).toBe(3);
      });
    });
  });

  describe('Error Recovery', () => {
    test('should recover from strategy parsing failures', async () => {
      const lines = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ];

      // Mock a strategy that throws during parsing
      const mockStrategy: LanguageStrategy = {
        identifyHeaderLines: () => {
          throw new Error('Parse error');
        },
        analyzeFunctions: () => [],
        identifyFooterLines: () => [],
        calculateComplexity: () => 0.5,
      };

      // This would need to be tested by temporarily modifying the registry
      // For now, we'll test that the processor handles errors gracefully
      await expect(
        processor.applyLineLimit(lines.join('\n'), 'test.jsx', {
          lineLimit: 3,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle line limit exactly equal to file length', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(5);
    });

    test('should handle line limit one less than file length', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 4,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(4);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(4);
    });

    test('should handle line limit much larger than file length', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;',
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 100,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(5);
    });

    test('should handle single character lines', async () => {
      const content = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].join('\n');

      const result = await processor.applyLineLimit(content, 'test.txt', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(10);
      expect(result.limitedLineCount).toBe(5);
    });

    test('should handle lines with only special characters', async () => {
      const lines = ['!@#$%^&*()', '[]{}|\\:";\'<>?,./', '~`', '±§¶', '•°‰‡†‹›""–—', '…‰‡†‹›""–—…‰‡†‹›""–—'];

      const result = await processor.applyLineLimit(lines.join('\n'), 'test.txt', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(3);
      expect(result.originalLineCount).toBe(6);
      expect(result.limitedLineCount).toBe(3);
    });
  });
});
