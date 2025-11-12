import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LineLimitStrategyRegistry } from '../../../../src/core/file/lineLimitStrategies/LineLimitStrategyRegistry.js';
import type { LanguageStrategy } from '../../../../src/core/file/lineLimitTypes.js';

// Mock all strategy classes
vi.mock('../../../../src/core/file/lineLimitStrategies/TypeScriptLineLimitStrategy.js', () => ({
  TypeScriptLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/PythonLineLimitStrategy.js', () => ({
  PythonLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/JavaLineLimitStrategy.js', () => ({
  JavaLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/GoLineLimitStrategy.js', () => ({
  GoLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/CLineLimitStrategy.js', () => ({
  CLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/CSharpLineLimitStrategy.js', () => ({
  CSharpLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/RustLineLimitStrategy.js', () => ({
  RustLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/PhpLineLimitStrategy.js', () => ({
  PhpLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/RubyLineLimitStrategy.js', () => ({
  RubyLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/SwiftLineLimitStrategy.js', () => ({
  SwiftLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/KotlinLineLimitStrategy.js', () => ({
  KotlinLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

vi.mock('../../../../src/core/file/lineLimitStrategies/DartLineLimitStrategy.js', () => ({
  DartLineLimitStrategy: vi.fn().mockImplementation(() => ({
    identifyHeaderLines: vi.fn(),
    analyzeFunctions: vi.fn(),
    identifyFooterLines: vi.fn(),
    calculateComplexity: vi.fn(),
  })),
}));

describe('LineLimitStrategyRegistry', () => {
  beforeEach(() => {
    // Clear the registry before each test
    LineLimitStrategyRegistry.clearStrategies();
  });

  afterEach(() => {
    // Clean up after each test
    LineLimitStrategyRegistry.clearStrategies();
  });

  describe('Initialization', () => {
    test('should initialize all supported strategies', () => {
      LineLimitStrategyRegistry.initialize();

      const strategies = LineLimitStrategyRegistry.getAllStrategies();
      const supportedLanguages = LineLimitStrategyRegistry.getSupportedLanguages();

      expect(supportedLanguages).toContain('typescript');
      expect(supportedLanguages).toContain('python');
      expect(supportedLanguages).toContain('java');
      expect(supportedLanguages).toContain('go');
      expect(supportedLanguages).toContain('c');
      expect(supportedLanguages).toContain('c');
      expect(supportedLanguages).toContain('c_sharp');
      expect(supportedLanguages).toContain('rust');
      expect(supportedLanguages).toContain('php');
      expect(supportedLanguages).toContain('ruby');
      expect(supportedLanguages).toContain('swift');
      expect(supportedLanguages).toContain('kotlin');
      expect(supportedLanguages).toContain('dart');
    });

    test('should not reinitialize existing strategies', () => {
      LineLimitStrategyRegistry.initialize();
      const firstCallStrategies = LineLimitStrategyRegistry.getAllStrategies();

      LineLimitStrategyRegistry.initialize();
      const secondCallStrategies = LineLimitStrategyRegistry.getAllStrategies();

      expect(firstCallStrategies).toEqual(secondCallStrategies);
    });

    test('should auto-initialize when accessing strategies', () => {
      // Registry should be empty initially
      const emptyStrategies = LineLimitStrategyRegistry.getAllStrategies();
      expect(Object.keys(emptyStrategies)).toHaveLength(0);

      // Accessing a strategy should trigger initialization
      const strategy = LineLimitStrategyRegistry.getStrategy('typescript');
      expect(strategy).toBeDefined();

      // Registry should now be populated
      const strategies = LineLimitStrategyRegistry.getAllStrategies();
      expect(Object.keys(strategies).length).toBeGreaterThan(0);
    });
  });

  describe('getStrategy', () => {
    beforeEach(() => {
      LineLimitStrategyRegistry.initialize();
    });

    test('should return strategy for supported languages', () => {
      const typescriptStrategy = LineLimitStrategyRegistry.getStrategy('typescript');
      expect(typescriptStrategy).toBeDefined();
      expect(typescriptStrategy).toHaveProperty('identifyHeaderLines');
      expect(typescriptStrategy).toHaveProperty('analyzeFunctions');
      expect(typescriptStrategy).toHaveProperty('identifyFooterLines');
      expect(typescriptStrategy).toHaveProperty('calculateComplexity');

      const pythonStrategy = LineLimitStrategyRegistry.getStrategy('python');
      expect(pythonStrategy).toBeDefined();
      expect(pythonStrategy).toHaveProperty('identifyHeaderLines');
      expect(pythonStrategy).toHaveProperty('analyzeFunctions');
      expect(pythonStrategy).toHaveProperty('identifyFooterLines');
      expect(pythonStrategy).toHaveProperty('calculateComplexity');
    });

    test('should return undefined for unsupported languages', () => {
      const strategy = LineLimitStrategyRegistry.getStrategy('unsupported' as any);
      expect(strategy).toBeUndefined();
    });

    test('should handle case sensitivity correctly', () => {
      const strategy = LineLimitStrategyRegistry.getStrategy('TypeScript' as any);
      expect(strategy).toBeUndefined(); // Should be case sensitive
    });

    test('should return same strategy instance for multiple calls', () => {
      const strategy1 = LineLimitStrategyRegistry.getStrategy('typescript');
      const strategy2 = LineLimitStrategyRegistry.getStrategy('typescript');

      expect(strategy1).toBe(strategy2);
    });
  });

  describe('hasStrategy', () => {
    beforeEach(() => {
      LineLimitStrategyRegistry.initialize();
    });

    test('should return true for supported languages', () => {
      expect(LineLimitStrategyRegistry.hasStrategy('typescript')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('python')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('java')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('go')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('c')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('c_sharp')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('rust')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('php')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('ruby')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('swift')).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('dart')).toBe(true);
    });

    test('should return false for unsupported languages', () => {
      // Use type assertion to test invalid inputs
      expect(LineLimitStrategyRegistry.hasStrategy('unsupported' as any)).toBe(false);
      expect(LineLimitStrategyRegistry.hasStrategy('unknown' as any)).toBe(false);
      expect(LineLimitStrategyRegistry.hasStrategy('' as any)).toBe(false);
    });

    test('should handle case sensitivity', () => {
      expect(LineLimitStrategyRegistry.hasStrategy('TypeScript' as any)).toBe(false);
      expect(LineLimitStrategyRegistry.hasStrategy('TYPESCRIPT' as any)).toBe(false);
      expect(LineLimitStrategyRegistry.hasStrategy('typescript')).toBe(true);
    });

    test('should auto-initialize when checking', () => {
      // Registry should be empty initially
      LineLimitStrategyRegistry.clearStrategies();
      expect(LineLimitStrategyRegistry.hasStrategy('typescript')).toBe(false);

      // After initialization, should return true
      LineLimitStrategyRegistry.initialize();
      expect(LineLimitStrategyRegistry.hasStrategy('typescript')).toBe(true);
    });
  });

  describe('getAllStrategies', () => {
    test('should return empty object when no strategies are registered', () => {
      const strategies = LineLimitStrategyRegistry.getAllStrategies();
      expect(strategies).toEqual({});
      expect(Object.keys(strategies)).toHaveLength(0);
    });

    test('should return all registered strategies', () => {
      LineLimitStrategyRegistry.initialize();

      const strategies = LineLimitStrategyRegistry.getAllStrategies();
      const languageKeys = Object.keys(strategies);

      expect(languageKeys.length).toBeGreaterThan(0);
      expect(languageKeys).toContain('typescript');
      expect(languageKeys).toContain('python');
      expect(languageKeys).toContain('java');

      // Verify each strategy has required methods
      Object.values(strategies).forEach((strategy) => {
        expect(strategy).toHaveProperty('identifyHeaderLines');
        expect(strategy).toHaveProperty('analyzeFunctions');
        expect(strategy).toHaveProperty('identifyFooterLines');
        expect(strategy).toHaveProperty('calculateComplexity');
      });
    });

    test('should return a copy of strategies object', () => {
      LineLimitStrategyRegistry.initialize();

      const strategies1 = LineLimitStrategyRegistry.getAllStrategies();
      const strategies2 = LineLimitStrategyRegistry.getAllStrategies();

      expect(strategies1).toEqual(strategies2);
      expect(strategies1).not.toBe(strategies2); // Should be different objects
    });

    test('should auto-initialize when getting strategies', () => {
      LineLimitStrategyRegistry.clearStrategies();

      const strategies = LineLimitStrategyRegistry.getAllStrategies();
      expect(Object.keys(strategies).length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedLanguages', () => {
    test('should return empty array when no strategies are registered', () => {
      const languages = LineLimitStrategyRegistry.getSupportedLanguages();
      expect(languages).toEqual([]);
      expect(languages).toHaveLength(0);
    });

    test('should return all supported language keys', () => {
      LineLimitStrategyRegistry.initialize();

      const languages = LineLimitStrategyRegistry.getSupportedLanguages();

      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('java');
      expect(languages).toContain('go');
      expect(languages).toContain('c');
      expect(languages).toContain('c_sharp');
      expect(languages).toContain('rust');
      expect(languages).toContain('php');
      expect(languages).toContain('ruby');
      expect(languages).toContain('swift');
      expect(languages).toContain('kotlin');
      expect(languages).toContain('dart');
    });

    test('should return array of strings', () => {
      LineLimitStrategyRegistry.initialize();

      const languages = LineLimitStrategyRegistry.getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      languages.forEach((language) => {
        expect(typeof language).toBe('string');
      });
    });

    test('should auto-initialize when getting languages', () => {
      LineLimitStrategyRegistry.clearStrategies();

      const languages = LineLimitStrategyRegistry.getSupportedLanguages();
      expect(languages.length).toBeGreaterThan(0);
    });
  });

  describe('registerStrategy', () => {
    test('should register custom strategy', () => {
      const customStrategy: LanguageStrategy = {
        identifyHeaderLines: vi.fn(),
        analyzeFunctions: vi.fn(),
        identifyFooterLines: vi.fn(),
        calculateComplexity: vi.fn(),
      };

      LineLimitStrategyRegistry.registerStrategy('custom', customStrategy);

      expect(LineLimitStrategyRegistry.hasStrategy('custom' as any)).toBe(true);
      const retrievedStrategy = LineLimitStrategyRegistry.getStrategy('custom' as any);
      expect(retrievedStrategy).toBe(customStrategy);
    });

    test('should override existing strategy', () => {
      LineLimitStrategyRegistry.initialize();

      const originalStrategy = LineLimitStrategyRegistry.getStrategy('typescript');
      expect(originalStrategy).toBeDefined();

      const newStrategy: LanguageStrategy = {
        identifyHeaderLines: vi.fn(),
        analyzeFunctions: vi.fn(),
        identifyFooterLines: vi.fn(),
        calculateComplexity: vi.fn(),
      };

      LineLimitStrategyRegistry.registerStrategy('typescript', newStrategy);

      const retrievedStrategy = LineLimitStrategyRegistry.getStrategy('typescript');
      expect(retrievedStrategy).toBe(newStrategy);
      expect(retrievedStrategy).not.toBe(originalStrategy);
    });

    test('should handle empty language name', () => {
      const customStrategy: LanguageStrategy = {
        identifyHeaderLines: vi.fn(),
        analyzeFunctions: vi.fn(),
        identifyFooterLines: vi.fn(),
        calculateComplexity: vi.fn(),
      };

      expect(() => {
        LineLimitStrategyRegistry.registerStrategy('', customStrategy);
      }).not.toThrow();

      expect(LineLimitStrategyRegistry.hasStrategy('' as any)).toBe(true);
    });

    test('should handle special characters in language name', () => {
      const customStrategy: LanguageStrategy = {
        identifyHeaderLines: vi.fn(),
        analyzeFunctions: vi.fn(),
        identifyFooterLines: vi.fn(),
        calculateComplexity: vi.fn(),
      };

      const languageName = 'custom-lang_with.special@chars';
      LineLimitStrategyRegistry.registerStrategy(languageName, customStrategy);

      expect(LineLimitStrategyRegistry.hasStrategy(languageName as any)).toBe(true);
      const retrievedStrategy = LineLimitStrategyRegistry.getStrategy(languageName as any);
      expect(retrievedStrategy).toBe(customStrategy);
    });
  });

  describe('unregisterStrategy', () => {
    beforeEach(() => {
      LineLimitStrategyRegistry.initialize();
    });

    test('should unregister existing strategy', () => {
      expect(LineLimitStrategyRegistry.hasStrategy('typescript')).toBe(true);

      LineLimitStrategyRegistry.unregisterStrategy('typescript');

      expect(LineLimitStrategyRegistry.hasStrategy('typescript')).toBe(false);
      expect(LineLimitStrategyRegistry.getStrategy('typescript')).toBeUndefined();
    });

    test('should handle unregistering non-existent strategy', () => {
      expect(() => {
        LineLimitStrategyRegistry.unregisterStrategy('nonexistent' as any);
      }).not.toThrow();

      expect(LineLimitStrategyRegistry.hasStrategy('nonexistent' as any)).toBe(false);
    });

    test('should handle unregistering from empty registry', () => {
      LineLimitStrategyRegistry.clearStrategies();

      expect(() => {
        LineLimitStrategyRegistry.unregisterStrategy('typescript');
      }).not.toThrow();
    });

    test('should handle empty language name', () => {
      LineLimitStrategyRegistry.registerStrategy('', {} as LanguageStrategy);
      expect(LineLimitStrategyRegistry.hasStrategy('' as any)).toBe(true);

      LineLimitStrategyRegistry.unregisterStrategy('' as any);
      expect(LineLimitStrategyRegistry.hasStrategy('' as any)).toBe(false);
    });
  });

  describe('clearStrategies', () => {
    test('should clear all strategies', () => {
      LineLimitStrategyRegistry.initialize();

      expect(LineLimitStrategyRegistry.getSupportedLanguages().length).toBeGreaterThan(0);

      LineLimitStrategyRegistry.clearStrategies();

      expect(LineLimitStrategyRegistry.getSupportedLanguages()).toEqual([]);
      expect(LineLimitStrategyRegistry.getAllStrategies()).toEqual({});
      expect(LineLimitStrategyRegistry.hasStrategy('typescript')).toBe(false);
      expect(LineLimitStrategyRegistry.getStrategy('python')).toBeUndefined();
    });

    test('should handle clearing empty registry', () => {
      LineLimitStrategyRegistry.clearStrategies();

      expect(() => {
        LineLimitStrategyRegistry.clearStrategies();
      }).not.toThrow();

      expect(LineLimitStrategyRegistry.getSupportedLanguages()).toEqual([]);
    });

    test('should allow reinitialization after clearing', () => {
      LineLimitStrategyRegistry.initialize();
      expect(LineLimitStrategyRegistry.getSupportedLanguages().length).toBeGreaterThan(0);

      LineLimitStrategyRegistry.clearStrategies();
      expect(LineLimitStrategyRegistry.getSupportedLanguages()).toEqual([]);

      LineLimitStrategyRegistry.initialize();
      expect(LineLimitStrategyRegistry.getSupportedLanguages().length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    test('should maintain consistency across operations', () => {
      // Register a custom strategy
      const customStrategy: LanguageStrategy = {
        identifyHeaderLines: vi.fn(),
        analyzeFunctions: vi.fn(),
        identifyFooterLines: vi.fn(),
        calculateComplexity: vi.fn(),
      };

      LineLimitStrategyRegistry.registerStrategy('test-lang', customStrategy);

      // Verify all operations work correctly
      expect(LineLimitStrategyRegistry.hasStrategy('test-lang' as any)).toBe(true);
      expect(LineLimitStrategyRegistry.getStrategy('test-lang' as any)).toBe(customStrategy);
      expect(LineLimitStrategyRegistry.getSupportedLanguages()).toContain('test-lang' as any);
      expect(LineLimitStrategyRegistry.getAllStrategies()['test-lang']).toBe(customStrategy);

      // Unregister and verify consistency
      LineLimitStrategyRegistry.unregisterStrategy('test-lang' as any);
      expect(LineLimitStrategyRegistry.hasStrategy('test-lang' as any)).toBe(false);
      expect(LineLimitStrategyRegistry.getStrategy('test-lang' as any)).toBeUndefined();
      expect(LineLimitStrategyRegistry.getSupportedLanguages()).not.toContain('test-lang' as any);
      expect(LineLimitStrategyRegistry.getAllStrategies()['test-lang']).toBeUndefined();
    });

    test('should handle multiple custom strategies', () => {
      const strategies = [
        {
          name: 'lang1',
          strategy: {
            identifyHeaderLines: vi.fn(),
            analyzeFunctions: vi.fn(),
            identifyFooterLines: vi.fn(),
            calculateComplexity: vi.fn(),
          } as LanguageStrategy,
        },
        {
          name: 'lang2',
          strategy: {
            identifyHeaderLines: vi.fn(),
            analyzeFunctions: vi.fn(),
            identifyFooterLines: vi.fn(),
            calculateComplexity: vi.fn(),
          } as LanguageStrategy,
        },
        {
          name: 'lang3',
          strategy: {
            identifyHeaderLines: vi.fn(),
            analyzeFunctions: vi.fn(),
            identifyFooterLines: vi.fn(),
            calculateComplexity: vi.fn(),
          } as LanguageStrategy,
        },
      ];

      strategies.forEach(({ name, strategy }) => {
        LineLimitStrategyRegistry.registerStrategy(name, strategy);
      });

      const allStrategies = LineLimitStrategyRegistry.getAllStrategies();
      const supportedLanguages = LineLimitStrategyRegistry.getSupportedLanguages();

      strategies.forEach(({ name, strategy }) => {
        expect(LineLimitStrategyRegistry.hasStrategy(name as any)).toBe(true);
        expect(LineLimitStrategyRegistry.getStrategy(name as any)).toBe(strategy);
        expect(supportedLanguages).toContain(name as any);
        expect(allStrategies[name]).toBe(strategy);
      });

      // Remove one strategy and verify others remain
      LineLimitStrategyRegistry.unregisterStrategy('lang2' as any);
      expect(LineLimitStrategyRegistry.hasStrategy('lang1' as any)).toBe(true);
      expect(LineLimitStrategyRegistry.hasStrategy('lang2' as any)).toBe(false);
      expect(LineLimitStrategyRegistry.hasStrategy('lang3' as any)).toBe(true);
    });
  });
});
