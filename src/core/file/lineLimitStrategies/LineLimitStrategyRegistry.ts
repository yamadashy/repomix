import type { SupportedLang } from '../../treeSitter/lang2Query.js';
import type { LanguageStrategy, LanguageStrategyRegistry } from '../lineLimitTypes.js';
import { CLineLimitStrategy } from './CLineLimitStrategy.js';
import { CSharpLineLimitStrategy } from './CSharpLineLimitStrategy.js';
import { DartLineLimitStrategy } from './DartLineLimitStrategy.js';
import { GoLineLimitStrategy } from './GoLineLimitStrategy.js';
import { JavaLineLimitStrategy } from './JavaLineLimitStrategy.js';
import { KotlinLineLimitStrategy } from './KotlinLineLimitStrategy.js';
import { PhpLineLimitStrategy } from './PhpLineLimitStrategy.js';
import { PythonLineLimitStrategy } from './PythonLineLimitStrategy.js';
import { RubyLineLimitStrategy } from './RubyLineLimitStrategy.js';
import { RustLineLimitStrategy } from './RustLineLimitStrategy.js';
import { SwiftLineLimitStrategy } from './SwiftLineLimitStrategy.js';
import { TypeScriptLineLimitStrategy } from './TypeScriptLineLimitStrategy.js';

/**
 * Registry for all language-specific line limiting strategies
 */
export class LineLimitStrategyRegistry {
  private static strategies: LanguageStrategyRegistry = {};

  /**
   * Initialize and register all strategies
   */
  static initialize(): void {
    // Register TypeScript strategy
    LineLimitStrategyRegistry.strategies['typescript'] = new TypeScriptLineLimitStrategy();

    // Register Python strategy
    LineLimitStrategyRegistry.strategies['python'] = new PythonLineLimitStrategy();

    // Register Java strategy
    LineLimitStrategyRegistry.strategies['java'] = new JavaLineLimitStrategy();

    // Register Go strategy
    LineLimitStrategyRegistry.strategies['go'] = new GoLineLimitStrategy();

    // Register C strategy
    LineLimitStrategyRegistry.strategies['c'] = new CLineLimitStrategy(false);

    // Register C++ strategy
    LineLimitStrategyRegistry.strategies['cpp'] = new CLineLimitStrategy(true);

    // Register C# strategy
    LineLimitStrategyRegistry.strategies['c_sharp'] = new CSharpLineLimitStrategy();

    // Register Rust strategy
    LineLimitStrategyRegistry.strategies['rust'] = new RustLineLimitStrategy();

    // Register PHP strategy
    LineLimitStrategyRegistry.strategies['php'] = new PhpLineLimitStrategy();

    // Register Ruby strategy
    LineLimitStrategyRegistry.strategies['ruby'] = new RubyLineLimitStrategy();

    // Register Swift strategy
    LineLimitStrategyRegistry.strategies['swift'] = new SwiftLineLimitStrategy();

    // Register Kotlin strategy
    LineLimitStrategyRegistry.strategies['kotlin'] = new KotlinLineLimitStrategy();

    // Register Dart strategy
    LineLimitStrategyRegistry.strategies['dart'] = new DartLineLimitStrategy();
  }

  /**
   * Get strategy for a specific language
   */
  static getStrategy(language: SupportedLang): LanguageStrategy | undefined {
    // Initialize if not already done
    if (Object.keys(LineLimitStrategyRegistry.strategies).length === 0) {
      LineLimitStrategyRegistry.initialize();
    }

    return LineLimitStrategyRegistry.strategies[language];
  }

  /**
   * Check if strategy exists for a language
   */
  static hasStrategy(language: SupportedLang): boolean {
    // Initialize if not already done
    if (Object.keys(LineLimitStrategyRegistry.strategies).length === 0) {
      LineLimitStrategyRegistry.initialize();
    }

    return language in LineLimitStrategyRegistry.strategies;
  }

  /**
   * Get all registered strategies
   */
  static getAllStrategies(): LanguageStrategyRegistry {
    // Initialize if not already done
    if (Object.keys(LineLimitStrategyRegistry.strategies).length === 0) {
      LineLimitStrategyRegistry.initialize();
    }

    return { ...LineLimitStrategyRegistry.strategies };
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages(): SupportedLang[] {
    // Initialize if not already done
    if (Object.keys(LineLimitStrategyRegistry.strategies).length === 0) {
      LineLimitStrategyRegistry.initialize();
    }

    return Object.keys(LineLimitStrategyRegistry.strategies) as SupportedLang[];
  }

  /**
   * Register a custom strategy
   */
  static registerStrategy(language: string, strategy: LanguageStrategy): void {
    LineLimitStrategyRegistry.strategies[language] = strategy;
  }

  /**
   * Unregister a strategy
   */
  static unregisterStrategy(language: string): void {
    delete LineLimitStrategyRegistry.strategies[language];
  }

  /**
   * Clear all strategies
   */
  static clearStrategies(): void {
    LineLimitStrategyRegistry.strategies = {};
  }
}

// Initialize the registry when the module is imported
LineLimitStrategyRegistry.initialize();
