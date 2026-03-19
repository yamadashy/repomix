import { GptEncoding } from 'gpt-tokenizer/GptEncoding';
import { resolveEncoding } from 'gpt-tokenizer/resolveEncoding';
import { logger } from '../../shared/logger.js';
import { type EncodingData, restoreEncodingFromData } from './encodingCache.js';
import type { TokenEncoding } from './tokenEncoding.js';

export class TokenCounter {
  private encoding: GptEncoding;

  constructor(encodingName: TokenEncoding, preBuiltData?: EncodingData) {
    const startTime = process.hrtime.bigint();

    if (preBuiltData) {
      // Fast path: restore from pre-built data shared by the main thread (~0.03ms)
      this.encoding = restoreEncodingFromData(preBuiltData);
    } else {
      // Slow path: build from scratch (~60-90ms)
      this.encoding = GptEncoding.getEncodingApi(encodingName, resolveEncoding);
    }

    const endTime = process.hrtime.bigint();
    const initTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    logger.debug(`TokenCounter initialization took ${initTime.toFixed(2)}ms${preBuiltData ? ' (pre-built)' : ''}`);
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

  // No-op for backward compatibility.
  // gpt-tokenizer is pure JavaScript and does not require explicit resource cleanup.
  public free(): void {}
}
