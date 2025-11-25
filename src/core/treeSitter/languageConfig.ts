import type { ParseStrategy } from './parseStrategies/BaseParseStrategy.js';
import { CssParseStrategy } from './parseStrategies/CssParseStrategy.js';
import { DefaultParseStrategy } from './parseStrategies/DefaultParseStrategy.js';
import { GoParseStrategy } from './parseStrategies/GoParseStrategy.js';
import { PythonParseStrategy } from './parseStrategies/PythonParseStrategy.js';
import { TypeScriptParseStrategy } from './parseStrategies/TypeScriptParseStrategy.js';
import { VueParseStrategy } from './parseStrategies/VueParseStrategy.js';
import { queryC } from './queries/queryC.js';
import { queryCpp } from './queries/queryCpp.js';
import { queryCSharp } from './queries/queryCSharp.js';
import { queryCss } from './queries/queryCss.js';
import { queryDart } from './queries/queryDart.js';
import { queryGo } from './queries/queryGo.js';
import { queryJava } from './queries/queryJava.js';
import { queryJavascript } from './queries/queryJavascript.js';
import { queryPhp } from './queries/queryPhp.js';
import { queryPython } from './queries/queryPython.js';
import { queryRuby } from './queries/queryRuby.js';
import { queryRust } from './queries/queryRust.js';
import { querySolidity } from './queries/querySolidity.js';
import { querySwift } from './queries/querySwift.js';
import { queryTypescript } from './queries/queryTypescript.js';
import { queryVue } from './queries/queryVue.js';

/**
 * Type representing all supported language names
 */
export type SupportedLang =
  | 'c'
  | 'c_sharp'
  | 'cpp'
  | 'css'
  | 'dart'
  | 'go'
  | 'java'
  | 'javascript'
  | 'php'
  | 'python'
  | 'ruby'
  | 'rust'
  | 'solidity'
  | 'swift'
  | 'typescript'
  | 'vue';

/**
 * Language configuration interface
 */
export interface LanguageConfig {
  /** Language name */
  name: SupportedLang;
  /** File extensions for this language (without dot) */
  extensions: string[];
  /** Tree-sitter query string */
  query: string;
  /** Factory function to create parse strategy instance (lazy initialization) */
  createStrategy: () => ParseStrategy;
}

/**
 * Registry of all supported language configurations
 * @see https://unpkg.com/browse/tree-sitter-wasms@latest/out/
 */
export const LANGUAGE_CONFIGS: readonly LanguageConfig[] = [
  {
    name: 'javascript',
    extensions: ['js', 'jsx', 'cjs', 'mjs', 'mjsx'],
    query: queryJavascript,
    createStrategy: () => new TypeScriptParseStrategy(), // JavaScript uses TypeScript strategy
  },
  {
    name: 'typescript',
    extensions: ['ts', 'tsx', 'mts', 'mtsx', 'cts'],
    query: queryTypescript,
    createStrategy: () => new TypeScriptParseStrategy(),
  },
  {
    name: 'python',
    extensions: ['py'],
    query: queryPython,
    createStrategy: () => new PythonParseStrategy(),
  },
  {
    name: 'go',
    extensions: ['go'],
    query: queryGo,
    createStrategy: () => new GoParseStrategy(),
  },
  {
    name: 'rust',
    extensions: ['rs'],
    query: queryRust,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'java',
    extensions: ['java'],
    query: queryJava,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'c_sharp',
    extensions: ['cs'],
    query: queryCSharp,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'ruby',
    extensions: ['rb'],
    query: queryRuby,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'php',
    extensions: ['php'],
    query: queryPhp,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'swift',
    extensions: ['swift'],
    query: querySwift,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'c',
    extensions: ['c', 'h'],
    query: queryC,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'cpp',
    extensions: ['cpp', 'hpp'],
    query: queryCpp,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'css',
    extensions: ['css'],
    query: queryCss,
    createStrategy: () => new CssParseStrategy(),
  },
  {
    name: 'solidity',
    extensions: ['sol'],
    query: querySolidity,
    createStrategy: () => new DefaultParseStrategy(),
  },
  {
    name: 'vue',
    extensions: ['vue'],
    query: queryVue,
    createStrategy: () => new VueParseStrategy(),
  },
  {
    name: 'dart',
    extensions: ['dart'],
    query: queryDart,
    createStrategy: () => new DefaultParseStrategy(),
  },
];

/**
 * Lookup maps for efficient O(1) access by extension or language name.
 * Built lazily on first access to improve testability and avoid import-time side effects.
 */
let extensionToLanguageMap: Map<string, LanguageConfig> | null = null;
let languageNameToConfigMap: Map<string, LanguageConfig> | null = null;

/**
 * Build lookup maps from LANGUAGE_CONFIGS with validation.
 * Throws an error if duplicate extensions are detected.
 */
function buildLookupMaps(): {
  extensionMap: Map<string, LanguageConfig>;
  nameMap: Map<string, LanguageConfig>;
} {
  const extensionMap = new Map<string, LanguageConfig>();
  const nameMap = new Map<string, LanguageConfig>();

  for (const config of LANGUAGE_CONFIGS) {
    // Map each extension to this language config with collision detection
    for (const ext of config.extensions) {
      const existing = extensionMap.get(ext);
      if (existing) {
        throw new Error(`Duplicate extension '${ext}' found: claimed by both '${existing.name}' and '${config.name}'`);
      }
      extensionMap.set(ext, config);
    }
    // Map language name to config
    nameMap.set(config.name, config);
  }

  return { extensionMap, nameMap };
}

/**
 * Get or initialize lookup maps (lazy initialization)
 */
function getLookupMaps(): {
  extensionMap: Map<string, LanguageConfig>;
  nameMap: Map<string, LanguageConfig>;
} {
  if (!extensionToLanguageMap || !languageNameToConfigMap) {
    const maps = buildLookupMaps();
    extensionToLanguageMap = maps.extensionMap;
    languageNameToConfigMap = maps.nameMap;
  }
  return {
    extensionMap: extensionToLanguageMap,
    nameMap: languageNameToConfigMap,
  };
}

/**
 * Get language configuration by file extension
 * @param extension - File extension without dot (e.g., 'ts', 'py')
 * @returns Language configuration or undefined if not found
 */
export function getLanguageConfigByExtension(extension: string): LanguageConfig | undefined {
  const { extensionMap } = getLookupMaps();
  return extensionMap.get(extension);
}

/**
 * Get language configuration by language name
 * @param languageName - Language name (e.g., 'typescript', 'python')
 * @returns Language configuration or undefined if not found
 */
export function getLanguageConfigByName(languageName: string): LanguageConfig | undefined {
  const { nameMap } = getLookupMaps();
  return nameMap.get(languageName);
}

/**
 * Get all supported language names
 * @returns Array of supported language names
 */
export function getSupportedLanguages(): SupportedLang[] {
  return LANGUAGE_CONFIGS.map((config) => config.name);
}
