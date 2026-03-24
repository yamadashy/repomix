import { logger } from '../../shared/logger.js';

// Supported token encoding types (compatible with tiktoken encoding names)
export type TokenEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'r50k_base';

// Lazy-loaded countTokens functions keyed by encoding.
// Stores a wrapper that always passes { allowedSpecial: 'all' } to treat
// special token sequences (<|endoftext|>, etc.) as ordinary text — matching
// the original tiktoken behavior of encode(content, [], []).
const encodingModules = new Map<string, (text: string) => number>();

const loadEncoding = async (encodingName: TokenEncoding): Promise<(text: string) => number> => {
  const cached = encodingModules.get(encodingName);
  if (cached) {
    return cached;
  }

  const startTime = process.hrtime.bigint();

  // Dynamic import of the specific encoding module from gpt-tokenizer
  const mod = await import(`gpt-tokenizer/encoding/${encodingName}`);
  // Always allow special tokens so that files/output containing sequences
  // like <|endoftext|> don't throw. This matches the original tiktoken
  // behavior (encode with empty allowed/disallowed lists) and has no
  // measurable per-call overhead for content without special tokens.
  const rawCountFn = mod.countTokens as (text: string, options?: { allowedSpecial?: 'all' }) => number;
  const countFn = (text: string): number => rawCountFn(text, { allowedSpecial: 'all' });
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

  // No-op: gpt-tokenizer is pure JS, no WASM resources to free
  public free(): void {}
}
