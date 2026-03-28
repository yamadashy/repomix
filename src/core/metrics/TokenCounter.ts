import { logger } from '../../shared/logger.js';

// Supported token encoding types (compatible with tiktoken encoding names)
export const TOKEN_ENCODINGS = ['o200k_base', 'cl100k_base', 'p50k_base', 'r50k_base'] as const;
export type TokenEncoding = (typeof TOKEN_ENCODINGS)[number];

interface CountTokensOptions {
  disallowedSpecial?: Set<string>;
}

type CountTokensFn = (text: string, options?: CountTokensOptions) => number;

// Fallback options: treat all text as regular content by disallowing nothing.
// This matches the old tiktoken behavior: encode(content, [], []).length
// where special tokens like <|endoftext|> are tokenized as ordinary text.
// Only used for the rare files (~0.1%) that contain special token sequences.
const FALLBACK_OPTIONS: CountTokensOptions = { disallowedSpecial: new Set() };

// Lazy-loaded countTokens functions keyed by encoding
const encodingModules = new Map<string, CountTokensFn>();

const loadEncoding = async (encodingName: TokenEncoding): Promise<CountTokensFn> => {
  const cached = encodingModules.get(encodingName);
  if (cached) {
    return cached;
  }

  const startTime = process.hrtime.bigint();

  // Dynamic import of the specific encoding module from gpt-tokenizer
  const mod = await import(`gpt-tokenizer/encoding/${encodingName}`);
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
      return this.countFn(content);
    } catch {
      if (filePath) {
        logger.warn(`Failed to count tokens. path: ${filePath}`);
      } else {
        logger.warn('Failed to count tokens.');
      }

      return 0;
    }
  }

  /**
   * Count tokens treating all content as plain text (no special token checking).
   * Use this for content known to contain special token sequences like <|endoftext|>.
   * Matches tiktoken's encode(content, [], []) behavior.
   */
  public countTokensPlainText(content: string, filePath?: string): number {
    if (!this.countFn) {
      throw new Error('TokenCounter not initialized. Call init() first.');
    }

    try {
      return this.countFn(content, FALLBACK_OPTIONS);
    } catch {
      if (filePath) {
        logger.warn(`Failed to count tokens. path: ${filePath}`);
      } else {
        logger.warn('Failed to count tokens.');
      }

      return 0;
    }
  }

  // No-op: gpt-tokenizer is pure JS, no WASM resources to free
  public free(): void {}
}
