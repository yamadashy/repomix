import { logger } from '../../shared/logger.js';

// Supported encoding names (same as tiktoken's TiktokenEncoding)
export type TokenCountEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'r50k_base';

// Options to treat special tokens as ordinary text (matching tiktoken's behavior)
const SPECIAL_TOKEN_OPTS = { allowedSpecial: 'all' as const };

// Lazy-loaded encoding modules
type CountTokensFn = (content: string, opts?: { allowedSpecial: 'all' }) => number;
const encodingModules = new Map<TokenCountEncoding, CountTokensFn>();

const loadEncoding = async (encodingName: TokenCountEncoding): Promise<CountTokensFn> => {
  const cached = encodingModules.get(encodingName);
  if (cached) return cached;

  const startTime = process.hrtime.bigint();

  let mod: { countTokens: CountTokensFn };
  switch (encodingName) {
    case 'o200k_base':
      mod = await import('gpt-tokenizer/encoding/o200k_base');
      break;
    case 'cl100k_base':
      mod = await import('gpt-tokenizer/encoding/cl100k_base');
      break;
    case 'p50k_base':
      mod = await import('gpt-tokenizer/encoding/p50k_base');
      break;
    case 'r50k_base':
      mod = await import('gpt-tokenizer/encoding/r50k_base');
      break;
    default:
      throw new Error(`Unsupported encoding: ${encodingName}`);
  }

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`TokenCounter encoding ${encodingName} loaded in ${initTime.toFixed(2)}ms`);

  encodingModules.set(encodingName, mod.countTokens);
  return mod.countTokens;
};

export class TokenCounter {
  private countFn: CountTokensFn;

  private constructor(countFn: CountTokensFn) {
    this.countFn = countFn;
  }

  static async create(encodingName: TokenCountEncoding): Promise<TokenCounter> {
    const countFn = await loadEncoding(encodingName);
    return new TokenCounter(countFn);
  }

  public countTokens(content: string, filePath?: string): number {
    try {
      // Fast path: count without special token processing (~2x faster).
      // Only ~0.1% of source files contain special token sequences like <|endoftext|>.
      return this.countFn(content);
    } catch {
      // Fallback: file contains special tokens, re-count with allowedSpecial
      try {
        return this.countFn(content, SPECIAL_TOKEN_OPTS);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (filePath) {
          logger.warn(`Failed to count tokens. path: ${filePath}, error: ${message}`);
        } else {
          logger.warn(`Failed to count tokens. error: ${message}`);
        }

        return 0;
      }
    }
  }

  public free(): void {
    // No-op: gpt-tokenizer is pure JS, no WASM resources to free
  }
}
