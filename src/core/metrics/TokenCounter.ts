import { logger } from '../../shared/logger.js';

// Supported token encoding types (OpenAI encoding names)
export const TOKEN_ENCODINGS = ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'] as const;
export type TokenEncoding = (typeof TOKEN_ENCODINGS)[number];

interface CountTokensOptions {
  disallowedSpecial?: Set<string>;
}

type CountTokensFn = (text: string, options?: CountTokensOptions) => number;

// Treat all text as regular content by disallowing nothing,
// so special tokens like <|endoftext|> are tokenized as ordinary text.
const PLAIN_TEXT_OPTIONS: CountTokensOptions = { disallowedSpecial: new Set() };

// Static import map for gpt-tokenizer encoding modules.
// Using explicit imports instead of dynamic template literals (e.g. `gpt-tokenizer/encoding/${name}`)
// so that bundlers (rolldown) can resolve and include them in the bundle.
const encodingImportMap: Record<TokenEncoding, () => Promise<{ countTokens: CountTokensFn }>> = {
  o200k_base: () => import('gpt-tokenizer/encoding/o200k_base'),
  cl100k_base: () => import('gpt-tokenizer/encoding/cl100k_base'),
  p50k_base: () => import('gpt-tokenizer/encoding/p50k_base'),
  p50k_edit: () => import('gpt-tokenizer/encoding/p50k_edit'),
  r50k_base: () => import('gpt-tokenizer/encoding/r50k_base'),
};

// Lazy-loaded countTokens functions keyed by encoding
const encodingModules = new Map<string, CountTokensFn>();

const loadEncoding = async (encodingName: TokenEncoding): Promise<CountTokensFn> => {
  const cached = encodingModules.get(encodingName);
  if (cached) {
    return cached;
  }

  const startTime = process.hrtime.bigint();

  const mod = await encodingImportMap[encodingName]();
  const countFn = mod.countTokens as CountTokensFn;
  encodingModules.set(encodingName, countFn);

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`TokenCounter initialization for ${encodingName} took ${initTime.toFixed(2)}ms`);

  return countFn;
};

export class TokenCounter {
  private countFn: CountTokensFn | null = null;
  private readonly encodingName: TokenEncoding;

  constructor(encodingName: TokenEncoding) {
    this.encodingName = encodingName;
  }

  async init(): Promise<void> {
    this.countFn = await loadEncoding(this.encodingName);
  }

  public countTokens(content: string, filePath?: string): number {
    if (!this.countFn) {
      throw new Error('TokenCounter not initialized. Call init() first.');
    }

    try {
      // Use PLAIN_TEXT_OPTIONS to treat all content as ordinary text,
      // skipping gpt-tokenizer's default regex scan for special tokens.
      return this.countFn(content, PLAIN_TEXT_OPTIONS);
    } catch (error) {
      let message = '';
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }

      if (filePath) {
        logger.warn(`Failed to count tokens. path: ${filePath}, error: ${message}`);
      } else {
        logger.warn(`Failed to count tokens. error: ${message}`);
      }

      return 0;
    }
  }

  // No-op: gpt-tokenizer is pure JS, no WASM resources to free
  public free(): void {}
}
