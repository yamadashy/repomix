import { get_encoding, type Tiktoken, type TiktokenEncoding } from 'tiktoken';
import { logger } from '../../shared/logger.js';

export class TokenCounter {
  private encoding: Tiktoken;

  constructor(encodingName: TiktokenEncoding) {
    const startTime = process.hrtime.bigint();

    // Setup encoding with the specified model
    this.encoding = get_encoding(encodingName);

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
      return this.encoding.encode(content, [], []).length;
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

  public countTokensPair(
    originalContent: string,
    truncatedContent: string,
    filePath?: string,
  ): { original: number; truncated: number } {
    const original = this.countTokens(originalContent, filePath);
    const truncated = this.countTokens(truncatedContent, filePath);
    return { original, truncated };
  }

  public free(): void {
    this.encoding.free();
  }
}
