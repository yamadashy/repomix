import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LineLimitProcessor, applyLineLimit } from '../../../src/core/file/lineLimitProcessor.js';
import { LineLimitError, LineLimitParseError, LineSection } from '../../../src/core/file/lineLimitTypes.js';
import type { LineLimitConfig } from '../../../src/core/file/lineLimitTypes.js';

// Mock the language loading and strategy registry
vi.mock('../../../src/core/treeSitter/loadLanguage.js', () => ({
  loadLanguage: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../../src/core/file/lineLimitStrategies/LineLimitStrategyRegistry.js', () => ({
  LineLimitStrategyRegistry: {
    getStrategy: vi.fn(() => ({
      identifyHeaderLines: vi.fn(() => [0, 1, 2]),
      analyzeFunctions: vi.fn(() => [
        {
          name: 'testFunction',
          startLine: 5,
          endLine: 15,
          complexity: 0.8,
          lineCount: 11,
          isSelected: false,
        },
      ]),
      identifyFooterLines: vi.fn(() => [20, 21]),
      calculateComplexity: vi.fn(() => 0.5),
    })),
  },
}));

describe('LineLimitProcessor', () => {
  let processor: LineLimitProcessor;

  beforeEach(() => {
    processor = new LineLimitProcessor();
  });

  afterEach(() => {
    processor.dispose();
  });

  describe('Initialization', () => {
    test('should initialize successfully for supported file types', async () => {
      await expect(processor.initialize('test.ts')).resolves.not.toThrow();
      await expect(processor.initialize('test.js')).resolves.not.toThrow();
      await expect(processor.initialize('test.py')).resolves.not.toThrow();
    });

    test('should throw error for unsupported file types', async () => {
      await expect(processor.initialize('test.xyz')).rejects.toThrow(LineLimitError);
      await expect(processor.initialize('test.unknown')).rejects.toThrow(LineLimitError);
    });

    test('should handle files without extensions', async () => {
      await expect(processor.initialize('Makefile')).rejects.toThrow(LineLimitError);
      await expect(processor.initialize('README')).rejects.toThrow(LineLimitError);
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock loadLanguage to throw an error
      const { loadLanguage } = await import('../../../src/core/treeSitter/loadLanguage.js');
      vi.mocked(loadLanguage).mockRejectedValueOnce(new Error('Failed to load language'));

      await expect(processor.initialize('test.ts')).rejects.toThrow(LineLimitParseError);
    });
  });

  describe('Line Allocation', () => {
    test('should calculate 30/60/10 distribution correctly for large limits', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 100,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
  
  saveUser(user: User) {
    // Save logic
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.metadata.allocation.headerLines).toBe(30);
      expect(result.metadata.allocation.coreLines).toBe(60);
      expect(result.metadata.allocation.footerLines).toBe(10);
    });

    test('should handle small limits correctly', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.metadata.allocation.headerLines).toBe(3); // Math.floor(10 * 0.3)
      expect(result.metadata.allocation.coreLines).toBe(6); // Math.floor(10 * 0.6)
      expect(result.metadata.allocation.footerLines).toBe(1); // Math.floor(10 * 0.1)
    });

    test('should handle very small limits', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';
import { Router } from '@angular/router';

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.metadata.allocation.headerLines).toBe(0); // Math.floor(3 * 0.3)
      expect(result.metadata.allocation.coreLines).toBe(1); // Math.floor(3 * 0.6)
      expect(result.metadata.allocation.footerLines).toBe(0); // Math.floor(3 * 0.1)
    });

    test('should handle limit of 1', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 1,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = 'import { Component } from "@angular/core";';

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.metadata.allocation.headerLines).toBe(0); // Math.floor(1 * 0.3)
      expect(result.metadata.allocation.coreLines).toBe(0); // Math.floor(1 * 0.6)
      expect(result.metadata.allocation.footerLines).toBe(0); // Math.floor(1 * 0.1)
    });
  });

  describe('Content Selection', () => {
    test('should preserve imports in header section', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 20,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    if (id > 0) {
      for (let i = 0; i < 10; i++) {
        if (i === id) {
          return { id, name: 'John' };
        }
      }
    }
    return null;
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      // Should include import statements
      const selectedContent = result.selectedLines.map((line) => line.content).join('\n');
      expect(selectedContent).toContain('import { Component } from');
      expect(selectedContent).toContain('import { Router } from');
    });

    test('should include interface definitions in header section', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 20,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      const selectedContent = result.selectedLines.map((line) => line.content).join('\n');
      expect(selectedContent).toContain('interface User');
    });

    test('should prioritize complex functions in core section', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 20,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  simpleFunction() {
    return 'simple';
  }
  
  complexFunction(param: string) {
    if (param) {
      for (let i = 0; i < 10; i++) {
        if (param[i] === 'a') {
          try {
            return this.processChar(param[i]);
          } catch (error) {
            return 'error';
          }
        }
      }
    }
    return 'not found';
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      // Complex function should be selected over simple one
      const selectedContent = result.selectedLines.map((line) => line.content).join('\n');
      expect(selectedContent).toContain('complexFunction');
    });

    test('should maintain line order in final output', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 15,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
  
  saveUser(user: User) {
    return user;
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      // Lines should be in ascending order
      for (let i = 1; i < result.selectedLines.length; i++) {
        expect(result.selectedLines[i].lineNumber).toBeGreaterThan(result.selectedLines[i - 1].lineNumber);
      }
    });

    test('should respect line section classifications', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 20,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      // Check that lines have correct section assignments
      const headerLines = result.selectedLines.filter((line) => line.section === LineSection.HEADER);
      const coreLines = result.selectedLines.filter((line) => line.section === LineSection.CORE);
      const footerLines = result.selectedLines.filter((line) => line.section === LineSection.FOOTER);

      expect(headerLines.length).toBeGreaterThan(0);
      expect(coreLines.length).toBeGreaterThan(0);
      // Footer lines might be empty depending on content
    });
  });

  describe('No Limit Scenario', () => {
    test('should return original content when under limit', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 100,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.originalLineCount).toBe(result.limitedLineCount);
      expect(result.truncatedFunctions).toHaveLength(0);
      expect(result.truncationIndicators).toHaveLength(0);
      expect(result.metadata.algorithm).toBe('no-limit');
    });

    test('should return all lines when content exactly matches limit', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 15,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}
      `.trim();

      const lines = content.split('\n');
      const configWithExactLimit: LineLimitConfig = {
        ...config,
        lineLimit: lines.length,
      };

      const result = await processor.applyLineLimit(content, 'test.ts', configWithExactLimit);

      expect(result.originalLineCount).toBe(result.limitedLineCount);
      expect(result.truncatedFunctions).toHaveLength(0);
      expect(result.truncationIndicators).toHaveLength(0);
    });

    test('should handle empty content', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = '';

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.originalLineCount).toBe(1); // Empty string still counts as 1 line
      expect(result.limitedLineCount).toBe(1);
      expect(result.selectedLines).toHaveLength(1);
      expect(result.selectedLines[0].content).toBe('');
    });

    test('should handle whitespace-only content', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = '   \n  \n\t\n   \n';

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.originalLineCount).toBe(4);
      expect(result.limitedLineCount).toBe(4);
      expect(result.selectedLines).toHaveLength(4);
    });
  });

  describe('Error Handling', () => {
    test('should handle unsupported language gracefully', async () => {
      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = 'some content';

      await expect(processor.initialize('test.xyz')).rejects.toThrow(LineLimitError);
    });

    test('should handle parse errors gracefully', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = 'invalid typescript syntax {{{';

      // Should not throw but handle gracefully
      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result).toBeDefined();
      expect(result.selectedLines.length).toBeGreaterThan(0);
    });

    test('should handle strategy errors gracefully', async () => {
      // Mock strategy to throw an error
      const { LineLimitStrategyRegistry } = await import('../../../src/core/file/lineLimitStrategies/LineLimitStrategyRegistry.js');
      vi.mocked(LineLimitStrategyRegistry.getStrategy).mockReturnValueOnce({
        identifyHeaderLines: vi.fn(() => {
          throw new Error('Strategy error');
        }),
        analyzeFunctions: vi.fn(() => []),
        identifyFooterLines: vi.fn(() => []),
        calculateComplexity: vi.fn(() => 0.5),
      });

      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = 'import { Component } from "@angular/core";';

      // Should fall back to heuristic behavior
      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result).toBeDefined();
      expect(result.selectedLines.length).toBeGreaterThan(0);
    });

    test('should handle null/undefined content', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      // @ts-expect-error Testing invalid input
      await expect(processor.applyLineLimit(null, 'test.ts', config)).rejects.toThrow();
      // @ts-expect-error Testing invalid input
      await expect(processor.applyLineLimit(undefined, 'test.ts', config)).rejects.toThrow();
    });
  });

  describe('Truncation Indicators', () => {
    test('should add truncation indicators when content is truncated', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.truncationIndicators.length).toBeGreaterThan(0);
      expect(result.truncationIndicators[0].type).toBe('block');
      expect(result.truncationIndicators[0].description).toContain('lines truncated');
    });

    test('should not add truncation indicators when disabled', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 5,
        preserveStructure: true,
        showTruncationIndicators: false,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

export default UserService;
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.truncationIndicators).toHaveLength(0);
    });

    test('should position truncation indicators correctly', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 3,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      if (result.truncationIndicators.length > 0) {
        const indicator = result.truncationIndicators[0];
        const lastSelectedLine = result.selectedLines[result.selectedLines.length - 1];
        expect(indicator.position).toBe(lastSelectedLine.lineNumber + 1);
      }
    });
  });

  describe('Caching', () => {
    test('should cache parsed content', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = 'import { Component } from "@angular/core";';

      // First call
      const result1 = await processor.applyLineLimit(content, 'test.ts', config);

      // Second call with same content should use cache
      const result2 = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result1.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result2.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      // Cached version should be faster or similar
    });

    test('should handle cache expiration', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = 'import { Component } from "@angular/core";';

      // First call
      await processor.applyLineLimit(content, 'test.ts', config);

      // Mock time passage (in real implementation, this would involve waiting)
      // For testing, we'll dispose and recreate to simulate cache clearing
      processor.dispose();
      processor = new LineLimitProcessor();
      await processor.initialize('test.ts');

      // Second call should re-parse
      const result2 = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result2.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metadata', () => {
    test('should include correct metadata in results', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 10,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

interface User {
  id: number;
  name: string;
}

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.algorithm).toBe('30-60-10-distribution');
      expect(result.metadata.language).toBe('typescript');
      expect(result.metadata.allocation).toBeDefined();
      expect(result.metadata.functionsAnalyzed).toBeGreaterThanOrEqual(0);
      expect(result.metadata.functionsSelected).toBeGreaterThanOrEqual(0);
    });

    test('should track function metrics correctly', async () => {
      await processor.initialize('test.ts');

      const config: LineLimitConfig = {
        lineLimit: 20,
        preserveStructure: true,
        showTruncationIndicators: true,
        enableCaching: true,
      };

      const content = `
import { Component } from '@angular/core';

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
  
  saveUser(user: any) {
    return user;
  }
  
  deleteUser(id: number) {
    return true;
  }
}
      `.trim();

      const result = await processor.applyLineLimit(content, 'test.ts', config);

      expect(result.metadata.functionsAnalyzed).toBeGreaterThan(0);
      expect(result.metadata.functionsSelected).toBeGreaterThanOrEqual(0);
      expect(result.metadata.functionsSelected).toBeLessThanOrEqual(result.metadata.functionsAnalyzed);
    });
  });

  describe('Resource Management', () => {
    test('should dispose resources correctly', () => {
      const processor = new LineLimitProcessor();
      
      expect(() => processor.dispose()).not.toThrow();
    });

    test('should handle multiple disposals', () => {
      const processor = new LineLimitProcessor();
      
      processor.dispose();
      expect(() => processor.dispose()).not.toThrow();
    });
  });
});

describe('applyLineLimit function', () => {
  test('should apply line limit and return formatted content', async () => {
    const content = `
import { Component } from '@angular/core';

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

export default UserService;
    `.trim();

    const result = await applyLineLimit(content, 'test.ts', 5, {
      preserveStructure: true,
      showTruncationIndicators: true,
      enableCaching: true,
    });

    expect(result.content).toBeDefined();
    expect(result.truncation).toBeDefined();
    expect(result.truncation!.lineLimit).toBe(5);
  });

  test('should handle no truncation scenario', async () => {
    const content = 'import { Component } from "@angular/core";';

    const result = await applyLineLimit(content, 'test.ts', 10, {
      preserveStructure: true,
      showTruncationIndicators: true,
      enableCaching: true,
    });

    expect(result.content).toBe(content);
    expect(result.truncation!.truncated).toBe(false);
  });

  test('should add truncation indicators to content when enabled', async () => {
    const content = `
import { Component } from '@angular/core';
import { Router } from '@angular/router';

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}
    `.trim();

    const result = await applyLineLimit(content, 'test.ts', 3, {
      preserveStructure: true,
      showTruncationIndicators: true,
      enableCaching: true,
    });

    expect(result.content).toContain('//');
    expect(result.truncation!.truncated).toBe(true);
  });

  test('should not add truncation indicators when disabled', async () => {
    const content = `
import { Component } from '@angular/core';
import { Router } from '@angular/router';

class UserService {
  constructor() {}
  
  getUser(id: number) {
    return { id, name: 'John' };
  }
}
    `.trim();

    const result = await applyLineLimit(content, 'test.ts', 3, {
      preserveStructure: true,
      showTruncationIndicators: false,
      enableCaching: true,
    });

    expect(result.content).not.toContain('//');
    expect(result.truncation!.truncated).toBe(true);
  });

  test('should handle errors and return original content', async () => {
    const content = 'some content';

    // Mock processor to throw an error
    vi.mock('../../../src/core/file/lineLimitProcessor.js', async () => {
      const actual = await vi.importActual('../../../src/core/file/lineLimitProcessor.js');
      return {
        ...actual,
        LineLimitProcessor: vi.fn().mockImplementation(() => ({
          initialize: vi.fn().mockRejectedValue(new Error('Test error')),
          applyLineLimit: vi.fn().mockRejectedValue(new Error('Test error')),
          dispose: vi.fn(),
        })),
      };
    });

    const result = await applyLineLimit(content, 'test.xyz', 5, {
      preserveStructure: true,
      showTruncationIndicators: true,
      enableCaching: true,
    });

    // Should return original content when line limiting fails
    expect(result.content).toBe(content);
    expect(result.truncation!.truncated).toBe(false);
  });

  test('should use default config when not provided', async () => {
    const content = 'import { Component } from "@angular/core";';

    const result = await applyLineLimit(content, 'test.ts', 10);

    expect(result.content).toBeDefined();
    expect(result.truncation).toBeDefined();
    expect(result.truncation!.lineLimit).toBe(10);
  });
});
