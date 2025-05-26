/**
 * Token counting functionality
 */
import { type Tiktoken, type TiktokenEncoding, get_encoding } from 'tiktoken';
import { logger } from '../../shared/logger.js';

export class TokenCounter {
  private encoding: Tiktoken;

  constructor(encodingName: TiktokenEncoding) {
    this.encoding = get_encoding(encodingName);
  }

  /**
   * Count tokens in a string
   */
  public countTokens(content: string, filePath?: string): number {
    try {
      return this.encoding.encode(content).length;
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

  /**
   * Free the encoding resources
   */
  public free(): void {
    this.encoding.free();
  }
}
