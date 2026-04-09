import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncodingAsync } from 'gpt-tokenizer/resolveEncodingAsync';
import { logger } from '../../shared/logger.js';
import type { TokenEncoding } from './tokenEncodings.js';

export { TOKEN_ENCODINGS, type TokenEncoding } from './tokenEncodings.js';

// BPE rank data type returned by resolveEncodingAsync.
// Matches gpt-tokenizer's RawBytePairRanks: each entry is either a base64 string
// or an array of raw byte values.
export type BpeRanks = readonly (string | readonly number[])[];

interface CountTokensOptions {
  disallowedSpecial?: Set<string>;
}

type CountTokensFn = (text: string, options?: CountTokensOptions) => number;

// Treat all text as regular content by disallowing nothing,
// so special tokens like <|endoftext|> are tokenized as ordinary text.
const PLAIN_TEXT_OPTIONS: CountTokensOptions = { disallowedSpecial: new Set() };

// Lazy-loaded countTokens functions keyed by encoding
const encodingModules = new Map<string, CountTokensFn>();

const createEncoderFromBpeRanks = (encodingName: TokenEncoding, bpeRanks: BpeRanks): CountTokensFn => {
  const encoder = GptEncoding.getEncodingApi(encodingName, () => bpeRanks);
  const countFn = encoder.countTokens.bind(encoder) as CountTokensFn;
  encodingModules.set(encodingName, countFn);
  return countFn;
};

const loadEncoding = async (encodingName: TokenEncoding): Promise<CountTokensFn> => {
  const cached = encodingModules.get(encodingName);
  if (cached) {
    return cached;
  }

  const startTime = process.hrtime.bigint();

  // Use resolveEncodingAsync to lazily load BPE rank data, then create a GptEncoding instance.
  // resolveEncodingAsync uses static import paths internally, so bundlers (rolldown) can resolve them.
  const bpeRanks = await resolveEncodingAsync(encodingName);
  const countFn = createEncoderFromBpeRanks(encodingName, bpeRanks);

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`TokenCounter initialization for ${encodingName} took ${initTime.toFixed(2)}ms`);

  return countFn;
};

/**
 * Pre-load BPE rank data for an encoding. Called on the main thread to load
 * once and share with worker threads, avoiding redundant file I/O per worker.
 */
export const loadBpeRanks = async (encodingName: TokenEncoding): Promise<BpeRanks> => {
  return resolveEncodingAsync(encodingName);
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

  /**
   * Initialize from pre-loaded BPE rank data, skipping the async file I/O.
   * Used by worker threads that receive BPE data from the main thread.
   */
  initFromBpeRanks(bpeRanks: BpeRanks): void {
    const startTime = process.hrtime.bigint();
    this.countFn = createEncoderFromBpeRanks(this.encodingName, bpeRanks);
    const endTime = process.hrtime.bigint();
    const initTime = Number(endTime - startTime) / 1e6;
    logger.debug(
      `TokenCounter initialization from pre-loaded BPE for ${this.encodingName} took ${initTime.toFixed(2)}ms`,
    );
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
