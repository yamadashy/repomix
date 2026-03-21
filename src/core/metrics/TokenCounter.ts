import { logger } from '../../shared/logger.js';
import type { GptTokenizerEncoding, TokenEncoding } from './tokenEncoding.js';
import { loadTokenEncoding } from './tokenEncoding.js';

export class TokenCounter {
  private encoding: GptTokenizerEncoding;

  constructor(encodingName: TokenEncoding) {
    const startTime = process.hrtime.bigint();

    this.encoding = loadTokenEncoding(encodingName);

    const endTime = process.hrtime.bigint();
    const initTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    logger.debug(`TokenCounter initialization took ${initTime.toFixed(2)}ms`);
  }

  public countTokens(content: string, filePath?: string): number {
    try {
      // Disable special token validation to handle files that may contain
      // special token sequences (e.g., tokenizer configs with <|endoftext|>).
      // This treats special tokens as ordinary text rather than control tokens,
      // which is appropriate for general code/text analysis where we're not
      // actually sending the content to an LLM API.
      return this.encoding.encode(content, { allowedSpecial: new Set(), disallowedSpecial: new Set() }).length;
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

  public free(): void {
    // No-op: gpt-tokenizer uses pure JS and doesn't require explicit memory cleanup
  }
}
