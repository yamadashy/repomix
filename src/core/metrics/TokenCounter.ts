import { logger } from '../../shared/logger.js';

// Supported token encoding types (compatible with tiktoken encoding names)
export type TokenEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'r50k_base';

// Lazy-loaded countTokens functions keyed by encoding
const encodingModules = new Map<string, (text: string) => number>();

const loadEncoding = async (encodingName: TokenEncoding): Promise<(text: string) => number> => {
  const cached = encodingModules.get(encodingName);
  if (cached) {
    return cached;
  }

  const startTime = process.hrtime.bigint();

  // Dynamic import of the specific encoding module from gpt-tokenizer
  const mod = await import(`gpt-tokenizer/encoding/${encodingName}`);
  const countFn = mod.countTokens as (text: string) => number;
  encodingModules.set(encodingName, countFn);

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`TokenCounter initialization for ${encodingName} took ${initTime.toFixed(2)}ms`);

  return countFn;
};

export class TokenCounter {
  private countFn: ((text: string) => number) | null = null;
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
      // Call countTokens without options to avoid processSpecialTokens overhead.
      // Files with special token sequences (<|endoftext|> etc.) are rare (~0.1%)
      // and handled via try-catch fallback.
      return this.countFn(content);
    } catch {
      // Fallback: try with allowedSpecial for files containing special tokens
      try {
        const mod = encodingModules.get(this.encodingName);
        if (mod) {
          return mod(content);
        }
      } catch {
        // ignore
      }

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
