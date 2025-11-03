import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { LineLimitProcessor } from '../../../src/core/file/lineLimitProcessor.js';
import type { LineLimitConfig } from '../../../src/core/file/lineLimitTypes.js';

describe('LineLimitProcessor', () => {
  let processor: LineLimitProcessor;

  beforeEach(() => {
    processor = new LineLimitProcessor();
  });

  afterEach(() => {
    processor.dispose();
  });

  describe('Line Allocation', () => {
    test('should calculate 30/60/10 distribution correctly', async () => {
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

      await expect(processor.initialize('test.xyz')).rejects.toThrow('Unsupported language');
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
  });
});
