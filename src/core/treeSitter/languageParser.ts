import * as path from 'node:path';
import Parser from 'web-tree-sitter';

import { RepomixError } from '../../shared/errorHandle.js';
import { ext2Lang } from './ext2Lang.js';
import { lang2Query, type SupportedLang } from './lang2Query.js';
import { loadLanguage } from './loadLanguage.js';
import { createParseStrategy, type ParseStrategy } from './parseStrategies/ParseStrategy.js';

interface LanguageResources {
  parser: Parser;
  query: Parser.Query;
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
      const lang = await loadLanguage(name);
      const parser = new Parser();
      parser.setLanguage(lang);
      const query = lang.query(lang2Query[name]);
      const strategy = createParseStrategy(name);

      const resources: LanguageResources = {
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

  public async getParserForLang(name: SupportedLang): Promise<Parser> {
    const resources = await this.getResources(name);
    return resources.parser;
  }

  public async getQueryForLang(name: SupportedLang): Promise<Parser.Query> {
    const resources = await this.getResources(name);
    return resources.query;
  }

  public async getStrategyForLang(name: SupportedLang): Promise<ParseStrategy> {
    const resources = await this.getResources(name);
    return resources.strategy;
  }

  public guessTheLang(filePath: string): SupportedLang | undefined {
    const ext = this.getFileExtension(filePath);
    if (!Object.keys(ext2Lang).includes(ext)) {
      return undefined;
    }
    return ext2Lang[ext as keyof typeof ext2Lang] as SupportedLang;
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
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
    }
    this.loadedResources.clear();
    this.initialized = false;
  }
}
