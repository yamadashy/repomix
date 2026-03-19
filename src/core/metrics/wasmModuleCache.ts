import fs from 'node:fs';
import { createRequire } from 'node:module';
import { logger } from '../../shared/logger.js';

let cachedModule: WebAssembly.Module | null = null;

/**
 * Pre-compile tiktoken WASM module once in the main thread.
 * The compiled WebAssembly.Module can be efficiently transferred to worker threads
 * via workerData (structured clone), avoiding redundant WASM compilation in each worker.
 */
export const getCompiledTiktokenWasmModule = (): WebAssembly.Module => {
  if (cachedModule) {
    return cachedModule;
  }

  const startTime = process.hrtime.bigint();

  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve('tiktoken/tiktoken_bg.wasm');
  const bytes = fs.readFileSync(wasmPath);
  cachedModule = new WebAssembly.Module(bytes);

  const endTime = process.hrtime.bigint();
  const initTime = Number(endTime - startTime) / 1e6;
  logger.debug(`Tiktoken WASM module pre-compiled in ${initTime.toFixed(2)}ms`);

  return cachedModule;
};
