import { get_encoding, init, type Tiktoken, type TiktokenEncoding } from 'tiktoken/init';
import { logger } from '../../shared/logger.js';

let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize tiktoken WASM module.
 * If a pre-compiled WebAssembly.Module is provided (from main thread via workerData),
 * only instantiation is needed (fast path ~5ms).
 * Otherwise, reads and compiles the WASM file from disk (slow path ~100ms).
 *
 * This function is idempotent - calling it multiple times is safe.
 */
export const initTiktokenWasm = (compiledModule?: WebAssembly.Module): Promise<void> => {
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const startTime = process.hrtime.bigint();

      if (compiledModule) {
        // Fast path: use pre-compiled module from main thread
        await init(async (imports) => new WebAssembly.Instance(compiledModule, imports));
      } else {
        // Slow path: read and compile WASM from disk
        const fs = await import('node:fs');
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        const wasmPath = require.resolve('tiktoken/tiktoken_bg.wasm');
        const bytes = fs.readFileSync(wasmPath);
        const module = new WebAssembly.Module(bytes);
        await init(async (imports) => new WebAssembly.Instance(module, imports));
      }

      const endTime = process.hrtime.bigint();
      const initTime = Number(endTime - startTime) / 1e6;
      logger.debug(
        `Tiktoken WASM initialized in ${initTime.toFixed(2)}ms${compiledModule ? ' (pre-compiled)' : ' (from disk)'}`,
      );
    })();
  }
  return wasmInitPromise;
};

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

  public free(): void {
    this.encoding.free();
  }
}
