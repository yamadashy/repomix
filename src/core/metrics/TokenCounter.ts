import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncodingAsync } from 'gpt-tokenizer/resolveEncodingAsync';
import { logger } from '../../shared/logger.js';
import { TOKEN_ENCODINGS, type TokenEncoding } from './tokenEncodings.js';

// Re-export for backward compatibility with existing
// `import { TOKEN_ENCODINGS, TokenEncoding } from './TokenCounter.js'` call sites.
export { TOKEN_ENCODINGS, type TokenEncoding };

interface CountTokensOptions {
  disallowedSpecial?: Set<string>;
}

type CountTokensFn = (text: string, options?: CountTokensOptions) => number;

// Treat all text as regular content by disallowing nothing,
// so special tokens like <|endoftext|> are tokenized as ordinary text.
const PLAIN_TEXT_OPTIONS: CountTokensOptions = { disallowedSpecial: new Set() };

// Lazy-loaded countTokens functions keyed by encoding
const encodingModules = new Map<string, CountTokensFn>();

type LoadEncodingFn = (encodingName: TokenEncoding) => Promise<CountTokensFn>;

const loadEncoding: LoadEncodingFn = async (encodingName) => {
  const cached = encodingModules.get(encodingName);
  if (cached) {
    return cached;
  }

  const startTime = process.hrtime.bigint();

  // Use resolveEncodingAsync to lazily load BPE rank data, then create a GptEncoding instance.
  // resolveEncodingAsync uses static import paths internally, so bundlers (rolldown) can resolve them.
  const bpeRanks = await resolveEncodingAsync(encodingName);
  const encoder = GptEncoding.getEncodingApi(encodingName, () => bpeRanks);
  const countFn = encoder.countTokens.bind(encoder) as CountTokensFn;
  encodingModules.set(encodingName, countFn);

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`TokenCounter initialization for ${encodingName} took ${initTime.toFixed(2)}ms`);

  return countFn;
};

export class TokenCounter {
  private countFn: CountTokensFn | null = null;
  private readonly encodingName: TokenEncoding;
  private readonly deps: { loadEncoding: LoadEncodingFn };

  constructor(
    encodingName: TokenEncoding,
    deps: { loadEncoding: LoadEncodingFn } = {
      loadEncoding,
    },
  ) {
    this.encodingName = encodingName;
    this.deps = deps;
  }

  async init(): Promise<void> {
    this.countFn = await this.deps.loadEncoding(this.encodingName);
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
