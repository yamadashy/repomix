import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { LineLimitProcessor } from '../../../src/core/file/lineLimitProcessor.js';
import { applyLineLimit } from '../../../src/core/file/lineLimitProcessor.js';

describe('Line Limit Integration Tests', () => {
  let processor: LineLimitProcessor;

  beforeEach(async () => {
    processor = new LineLimitProcessor();
  });

  afterEach(() => {
    processor.dispose();
  });

  describe('Basic Integration', () => {
    test('should work with simple JavaScript file', async () => {
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
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(3);
      expect(result.originalLineCount).toBe(5);
      expect(result.limitedLineCount).toBe(3);
      expect(result.truncationIndicators.length).toBeGreaterThan(0);
    });

    test('should work with TypeScript file', async () => {
      const content = [
        'import React from "react";',
        'interface Props {',
        '  message: string;',
        '}',
        'const Component: React.FC<Props> = ({ message }) => {',
        '  return <div>{message}</div>;',
        '};',
        'export default Component;'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.tsx', {
        lineLimit: 4,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(4);
      expect(result.originalLineCount).toBe(8);
      expect(result.limitedLineCount).toBe(4);
    });

    test('should work with Python file', async () => {
      const content = [
        'import os',
        'import sys',
        '',
        'def main():',
        '    """Main function."""',
        '    print("Hello, World!")',
        '    return 0',
        '',
        'if __name__ == "__main__":',
        '    sys.exit(main())'
      ].join('\n');

      const result = await processor.applyLineLimit(content, 'test.py', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toHaveLength(5);
      expect(result.originalLineCount).toBe(10);
      expect(result.limitedLineCount).toBe(5);
    });
  });

  describe('Integration with applyLineLimit Function', () => {
    test('should work with standalone applyLineLimit function', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await applyLineLimit(content, 'test.jsx', 3, {
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.content).toBeDefined();
      expect(result.truncation).toBeDefined();
      expect(result.truncation?.truncated).toBe(true);
      expect(result.truncation?.originalLineCount).toBe(5);
      expect(result.truncation?.truncatedLineCount).toBe(3);
      expect(result.truncation?.lineLimit).toBe(3);
    });

    test('should work with truncation indicators in applyLineLimit', async () => {
      const content = [
        'import React from "react";',
        'import { useState } from "react";',
        'function App() {',
        '  const [count, setCount] = useState(0);',
        '  return (',
        '    <div>',
        '      <h1>Count: {count}</h1>',
        '      <button onClick={() => setCount(count + 1)}>+</button>',
        '    </div>',
        '  );',
        '}',
        'export default App;'
      ].join('\n');

      const result = await applyLineLimit(content, 'test.jsx', 5, {
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.content).toBeDefined();
      expect(result.content).toContain('//'); // Should contain truncation indicator
      expect(result.truncation?.truncated).toBe(true);
    });

    test('should work without truncation indicators in applyLineLimit', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      const result = await applyLineLimit(content, 'test.jsx', 3, {
        preserveStructure: true,
        showTruncationIndicators: false,
        enableCaching: true,
      });

      expect(result.content).toBeDefined();
      expect(result.content).not.toContain('// ... lines truncated'); // Should not contain truncation indicator
      expect(result.truncation?.truncated).toBe(true);
    });
  });

  describe('Multi-File Processing Integration', () => {
    test('should handle multiple files with different configurations', async () => {
      const file1Content = [
        'import React from "react";',
        'function Component1() {',
        '  return <div>Component 1</div>;',
        '}',
        'export default Component1;'
      ].join('\n');

      const file2Content = [
        'import React from "react";',
        'import { useState } from "react";',
        'function Component2() {',
        '  const [state, setState] = useState("initial");',
        '  return (',
        '    <div>',
        '      <h1>Component 2</h1>',
        '      <p>{state}</p>',
        '    </div>',
        '  );',
        '}',
        'export default Component2;'
      ].join('\n');

      // Process both files with different line limits
      const [result1, result2] = await Promise.all([
        processor.applyLineLimit(file1Content, 'file1.jsx', {
          lineLimit: 3,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
        processor.applyLineLimit(file2Content, 'file2.jsx', {
          lineLimit: 5,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ]);

      expect(result1.selectedLines).toHaveLength(3);
      expect(result2.selectedLines).toHaveLength(5);

      expect(result1.truncationIndicators.length).toBeGreaterThan(0);
      expect(result2.truncationIndicators.length).toBeGreaterThan(0);
    });

    test('should handle files with different languages', async () => {
      const jsContent = [
        'import React from "react";',
        'function JsComponent() {',
        '  return <div>JS Component</div>;',
        '}',
        'export default JsComponent;'
      ].join('\n');

      const pyContent = [
        'def python_function():',
        '    """Python function with docstring."""',
        '    print("Python function")',
        '    return True',
        '',
        'if __name__ == "__main__":',
        '    python_function()'
      ].join('\n');

      const [jsResult, pyResult] = await Promise.all([
        processor.applyLineLimit(jsContent, 'file.jsx', {
          lineLimit: 3,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
        processor.applyLineLimit(pyContent, 'file.py', {
          lineLimit: 5,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        }),
      ]);

      expect(jsResult.selectedLines).toHaveLength(3);
      expect(pyResult.selectedLines).toHaveLength(5);

      expect(jsResult.truncationIndicators.length).toBeGreaterThan(0);
      expect(pyResult.truncationIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle errors in processing gracefully', async () => {
      const content = 'invalid content with no structure';

      // Should not throw even with invalid content
      const result = await processor.applyLineLimit(content, 'test.txt', {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      expect(result.selectedLines).toBeDefined();
      expect(result.originalLineCount).toBe(1);
      expect(result.limitedLineCount).toBe(1);
    });

    test('should handle unsupported file types', async () => {
      const content = 'some content';

      // Should handle unsupported file types gracefully
      await expect(
        processor.applyLineLimit(content, 'test.unknown', {
          lineLimit: 5,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        })
      ).rejects.toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    test('should handle large files efficiently', async () => {
      // Create a moderately large file
      const lines = [
        'import React from "react";',
        'import { useState, useEffect } from "react";',
        '',
        'function LargeComponent() {',
        '  const [data, setData] = useState([]);',
        '  ',
        '  useEffect(() => {',
        '    // Simulate data processing',
        '    const largeArray = Array.from({ length: 100 }, (_, i) => ({',
        '      id: i,',
        '      name: `Item ${i}`,',
        '      value: Math.random() * 100,',
        '    }));',
        '    setData(largeArray);',
        '  }, []);',
        '  ',
        '  return (',
        '    <div>',
        '      <h1>Large Component</h1>',
        '      <div>Total items: {data.length}</div>',
        '    </div>',
        '  );',
        '}',
        '',
        'export default LargeComponent;'
      ];

      const content = lines.join('\n');

      const startTime = Date.now();
      const result = await processor.applyLineLimit(content, 'large.jsx', {
        lineLimit: 20,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      });
      const endTime = Date.now();

      expect(result.selectedLines).toBeDefined();
      expect(result.originalLineCount).toBeGreaterThan(30);
      expect(result.limitedLineCount).toBe(20);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle concurrent processing efficiently', async () => {
      const baseContent = [
        'import React from "react";',
        'function Component() {',
        '  return <div>Test</div>;',
        '}',
        'export default Component;'
      ].join('\n');

      // Process multiple files concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        processor.applyLineLimit(baseContent, `file${i}.jsx`, {
          lineLimit: 3,
          preserveStructure: true,
          showTruncationIndicators: true,
          enableCaching: true,
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.selectedLines).toHaveLength(3);
        expect(result.originalLineCount).toBe(5);
        expect(result.limitedLineCount).toBe(3);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Configuration Integration', () => {
    test('should work with different configuration combinations', async () => {
      const content = [
        'import React from "react";',
        'function App() {',
        '  return <div>Hello</div>;',
        '}',
        'export default App;'
      ].join('\n');

      // Test with structure preservation disabled
      const result1 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: false,
        showTruncationIndicators: true,
        enableCaching: true,
      });

      // Test with truncation indicators disabled
      const result2 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: false,
        enableCaching: true,
      });

      // Test with caching disabled
      const result3 = await processor.applyLineLimit(content, 'test.jsx', {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: false,
      });

      expect(result1.selectedLines).toHaveLength(3);
      expect(result2.selectedLines).toHaveLength(3);
      expect(result3.selectedLines).toHaveLength(3);

      expect(result1.truncationIndicators.length).toBeGreaterThan(0);
      expect(result2.truncationIndicators).toHaveLength(0);
      expect(result3.truncationIndicators.length).toBeGreaterThan(0);
    });
  });
});