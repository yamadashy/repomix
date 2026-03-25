import * as path from 'node:path';

import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { getLanguageConfigByExtension, getLanguageConfigByName, type SupportedLang } from './languageConfig.js';
import { loadLanguage } from './loadLanguage.js';
import type { ParseStrategy } from './parseStrategies/BaseParseStrategy.js';

// Lazy-load web-tree-sitter (~50-80ms WASM runtime) — only needed when
// --compress or --remove-comments is enabled. Avoids loading WASM on every
// import of repomix's public API (index.ts re-exports parseFile).
let _Parser: typeof import('web-tree-sitter').Parser | undefined;
let _Query: typeof import('web-tree-sitter').Query | undefined;
const getTreeSitter = async () => {
  if (!_Parser) {
    const mod = await import('web-tree-sitter');
    _Parser = mod.Parser;
    _Query = mod.Query;
  }
  return { Parser: _Parser!, Query: _Query! };
};

interface LanguageResources {
  lang: SupportedLang;
  parser: InstanceType<typeof import('web-tree-sitter').Parser>;
  query: InstanceType<typeof import('web-tree-sitter').Query>;
  strategy: ParseStrategy;
}

export class LanguageParser {
  private loadedResources: Map<SupportedLang, LanguageResources> = new Map();
  private initialized = false;

  private getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase().slice(1);
  }

  private async prepareLang(name: SupportedLang): Promise<LanguageResources> {
    try {
      const config = getLanguageConfigByName(name);
      if (!config) {
        throw new RepomixError(`Language configuration not found for: ${name}`);
      }

      const { Parser, Query } = await getTreeSitter();
      const lang = await loadLanguage(name);
      const parser = new Parser();
      parser.setLanguage(lang);
      const query = new Query(lang, config.query);
      // Create strategy instance lazily when first needed
      // NOTE: Strategy instances are cached per language in this.loadedResources
      // and shared across all files of the same language. This is safe because
      // all current strategies are stateless and only use the parameters passed
      // to their parseCapture method.
      const strategy = config.createStrategy();

      const resources: LanguageResources = {
        lang: name,
        parser,
        query,
        strategy,
      };

      this.loadedResources.set(name, resources);
      return resources;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RepomixError(`Failed to prepare language ${name}: ${message}`);
    }
  }

  private async getResources(name: SupportedLang): Promise<LanguageResources> {
    if (!this.initialized) {
      throw new RepomixError('LanguageParser is not initialized. Call init() first.');
    }

    const resources = this.loadedResources.get(name);
    if (!resources) {
      return this.prepareLang(name);
    }
    return resources;
  }

  public async getParserForLang(name: SupportedLang): Promise<InstanceType<typeof import('web-tree-sitter').Parser>> {
    const resources = await this.getResources(name);
    return resources.parser;
  }

  public async getQueryForLang(name: SupportedLang): Promise<InstanceType<typeof import('web-tree-sitter').Query>> {
    const resources = await this.getResources(name);
    return resources.query;
  }

  public async getStrategyForLang(name: SupportedLang): Promise<ParseStrategy> {
    const resources = await this.getResources(name);
    return resources.strategy;
  }

  public guessTheLang(filePath: string): SupportedLang | undefined {
    const ext = this.getFileExtension(filePath);
    const config = getLanguageConfigByExtension(ext);
    if (!config) {
      logger.debug(`No language configuration found for extension: ${ext}`);
    }
    return config?.name;
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const { Parser } = await getTreeSitter();
      await Parser.init();
      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RepomixError(`Failed to initialize parser: ${message}`);
    }
  }

  public async dispose(): Promise<void> {
    for (const resources of this.loadedResources.values()) {
      resources.parser.delete();
      logger.debug(`Deleted parser for language: ${resources.lang}`);
    }
    this.loadedResources.clear();
    this.initialized = false;
  }
}
