import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncodingAsync } from 'gpt-tokenizer/resolveEncodingAsync';
import { logger } from '../../shared/logger.js';
import type { TokenEncoding } from './tokenEncoding.js';

export class TokenCounter {
  private encoding: GptEncoding;

  private constructor(encoding: GptEncoding) {
    this.encoding = encoding;
  }

  /**
   * Create a TokenCounter instance asynchronously.
   * Uses dynamic import to load only the required BPE encoding data,
   * avoiding the cost of loading all encodings (~4MB) on every worker.
   */
  public static async create(encodingName: TokenEncoding): Promise<TokenCounter> {
    const startTime = process.hrtime.bigint();

    const ranks = await resolveEncodingAsync(encodingName);
    const encoding = GptEncoding.getEncodingApi(encodingName, () => ranks);

    const endTime = process.hrtime.bigint();
    const initTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    logger.debug(`TokenCounter initialization took ${initTime.toFixed(2)}ms`);

    return new TokenCounter(encoding);
  }

  public countTokens(content: string, filePath?: string): number {
    try {
      // Disable special token validation to handle files that may contain
      // special token sequences (e.g., tokenizer configs with <|endoftext|>).
      // This treats special tokens as ordinary text rather than control tokens,
      // which is appropriate for general code/text analysis where we're not
      // actually sending the content to an LLM API.
      return this.encoding.encode(content, { disallowedSpecial: new Set() }).length;
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

  // No-op retained for public API backward compatibility.
  // gpt-tokenizer is pure JavaScript — memory is managed by GC,
  // unlike tiktoken which required explicit WASM resource cleanup.
  public free(): void {}
}
