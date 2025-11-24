import type { Node, Query, Tree } from 'web-tree-sitter';
import type { RepomixConfigMerged } from '../../../config/configSchema.js';
import type { SupportedLang } from '../languageConfig.js';
import { getLanguageConfigByName } from '../languageConfig.js';
import { DefaultParseStrategy } from './DefaultParseStrategy.js';

export interface ParseContext {
  fileContent: string;
  lines: string[];
  tree: Tree;
  query: Query;
  config: RepomixConfigMerged;
}

export interface ParseStrategy {
  parseCapture(
    capture: { node: Node; name: string },
    lines: string[],
    processedChunks: Set<string>,
    context: ParseContext,
  ): string | null;
}

/**
 * Create a parse strategy for the given language
 * @param lang - The language name
 * @returns Parse strategy instance
 */
export function createParseStrategy(lang: SupportedLang): ParseStrategy {
  const config = getLanguageConfigByName(lang);
  return config?.strategy ?? new DefaultParseStrategy();
}
