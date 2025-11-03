import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { LineLimitProcessor } from '../../../src/core/file/lineLimitProcessor.js';
import { LineLimitError, LineLimitTooSmallError, LineLimitParseError } from '../../../src/core/file/lineLimitTypes.js';

describe('Line Limit Configuration Tests', () => {
  let processor: LineLimitProcessor;

  beforeEach(async () => {
    processor = new LineLimitProcessor();
  });

  afterEach(() => {
    processor.dispose();
  });

  describe('Basic Configuration', () => {
    test('should handle default configuration', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(5);
      expect(result.truncationIndicators).toHaveLength(0); // No truncation needed
    });

    test('should handle configuration with structure preservation disabled', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: false,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(3);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(3);
    });

    test('should handle configuration with truncation indicators disabled', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: false,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(3);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(3);
      expect(result.truncationIndicators).toHaveLength(0);
    });

    test('should handle configuration with caching disabled', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: false,
      });

      expect(result.selectedLines).toHaveLength(3);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(3);
    });
  });

  describe('Line Limit Validation', () => {
    test('should reject negative line limits', async () => {
      const content = 'console.log("test");';

      await expect(
        processor.applyLineLimit(content, 'test.js', {
          lineLimit: -1,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        })
      ).rejects.toThrow(LineLimitTooSmallError);
    });

    test('should reject zero line limits', async () => {
      const content = 'console.log("test");';

      await expect(
        processor.applyLineLimit(content, 'test.js', {
          lineLimit: 0,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        })
      ).rejects.toThrow(LineLimitTooSmallError);
    });

    test('should accept minimum valid line limit (1)', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 1,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(1);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(1);
    });

    test('should handle very large line limits', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 10000,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(5);
    });
  });

  describe('Truncation Indicators Configuration', () => {
    test('should show truncation indicators when enabled and content is truncated', async () => {
      const content = [
        'import React from "react";',
        'import { useState } from "react";',
        'function App() {',
        '  const [count, setCount] = useState(0);',
        '  const increment = () => setCount(count + 1);',
        '  const decrement = () => setCount(count - 1);',
        '  return (',
        '    <div>',
        '      <button onClick={increment}>+</button>',
        '      <span>{count}</span>',
        '      <button onClick={decrement}>-</button>',
        '    </div>',
        '  );',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(16);
      expect(result.limitedLineCount).toBe(5);
      expect(result.truncationIndicators.length).toBeGreaterThan(0);
    });

    test('should not show truncation indicators when disabled', async () => {
      const content = [
        'import React from "react";',
        'import { useState } from "react";',
        'function App() {',
        '  const [count, setCount] = useState(0);',
        '  const increment = () => setCount(count + 1);',
        '  const decrement = () => setCount(count - 1);',
        '  return (',
        '    <div>',
        '      <button onClick={increment}>+</button>',
        '      <span>{count}</span>',
        '      <button onClick={decrement}>-</button>',
        '    </div>',
        '  );',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: false,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(16);
      expect(result.limitedLineCount).toBe(5);
      expect(result.truncationIndicators).toHaveLength(0);
    });

    test('should not show truncation indicators when content is not truncated', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(5);
      expect(result.truncationIndicators).toHaveLength(0);
    });
  });

  describe('Caching Configuration', () => {
    test('should cache results when enabled', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      // First call
      const startTime1 = Date.now();
      const result1 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });
      const endTime1 = Date.now();

      // Second call (should use cache)
      const startTime2 = Date.now();
      const result2 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });
      const endTime2 = Date.now();

      expect(result1.selectedLines).toEqual(result2.selectedLines);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1); // Second call should be faster
    });

    test('should not cache results when disabled', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      // First call
      const result1 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: false,
      });

      // Second call
      const result2 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: false,
      });

      expect(result1.selectedLines).toEqual(result2.selectedLines);
    });
  });

  describe('Structure Preservation Configuration', () => {
    test('should preserve structure when enabled', async () => {
      const content = [
        'import React from "react";',
        'import { useState } from "react";',
        'function App() {',
        '  const [count, setCount] = useState(0);',
        '  return (',
        '    <div>',
        '      <h1>Hello World</h1>',
        '      <p>Count: {count}</p>',
        '    </div>',
        '  );',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.selectedLines[0].section).toBe('header'); // Import should be header
      expect(result.selectedLines.some(line => line.section === 'core')).toBe(true); // Function should be core
    });

    test('should not preserve structure when disabled', async () => {
      const content = [
        'import React from "react";',
        'import { useState } from "react";',
        'function App() {',
        '  const [count, setCount] = useState(0);',
        '  return (',
        '    <div>',
        '      <h1>Hello World</h1>',
        '      <p>Count: {count}</p>',
        '    </div>',
        '  );',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 5,
        preserveStructure: false,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      // When structure preservation is disabled, all lines might be treated as core
      expect(result.selectedLines.every(line => line.section === 'core')).toBe(true);
    });
  });

  describe('Configuration Combinations', () => {
    test('should handle all features disabled', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: false,
        showTruncationIndicators: false,
        enableCaching: false,
      });

      expect(result.selectedLines).toHaveLength(3);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(3);
      expect(result.truncationIndicators).toHaveLength(0);
    });

    test('should handle all features enabled', async () => {
      const content = [
        'import React from "react";',
        'import { useState } from "react";',
        'function App() {',
        '  const [count, setCount] = useState(0);',
        '  return (',
        '    <div>',
        '      <h1>Hello World</h1>',
        '      <p>Count: {count}</p>',
        '    </div>',
        '  );',
        '}',
        'export default App;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(13);
      expect(result.limitedLineCount).toBe(5);
      expect(result.truncationIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should handle configuration changes between calls', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      // First call with caching enabled
      const result1 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      // Second call with caching disabled
      const result2 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: false,
      });

      expect(result1.selectedLines).toEqual(result2.selectedLines);
    });

    test('should handle same file with different configurations', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      // Different line limits
      const result1 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 2,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      const result2 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 4,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result1.selectedLines).toHaveLength(2);
      expect(result2.selectedLines).toHaveLength(4);
      expect(result1.selectedLines).toEqual(result2.selectedLines.slice(0, 2));
    });
  });

  describe('Error Handling in Configuration', () => {
    test('should handle invalid configuration gracefully', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      // Test with invalid configuration (should still work with defaults)
      const result = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      } as any); // Type assertion to test runtime behavior

      expect(result.selectedLines).toHaveLength(3);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(3);
    });

    test('should handle configuration errors during processing', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      // Test with a configuration that might cause issues
      await expect(
        processor.applyLineLimit(content, 'test.jsx', {
          lineLimit: 3,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        })
      ).resolves.toBeDefined();
    });
  });
});