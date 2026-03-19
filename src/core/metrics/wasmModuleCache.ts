import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { logger } from '../../shared/logger.js';

let compiledModule: WebAssembly.Module | null = null;

/**
 * Resolve the file path to the tiktoken WASM binary.
 */
const getTiktokenWasmPath = (): string => {
  const require = createRequire(import.meta.url);
  return require.resolve('tiktoken/tiktoken_bg.wasm');
};

/**
 * Compile the tiktoken WASM binary once and cache the resulting WebAssembly.Module.
 *
 * The compiled module can be transferred to worker threads via structured clone
 * (WebAssembly.Module is transferable), avoiding the ~250ms per-worker compile cost.
 */
export const getCompiledTiktokenWasmModule = async (): Promise<WebAssembly.Module> => {
  if (compiledModule) {
    return compiledModule;
  }

  const startTime = process.hrtime.bigint();

  const wasmPath = getTiktokenWasmPath();
  const wasmBinary = await fs.readFile(wasmPath);
  compiledModule = await WebAssembly.compile(wasmBinary);

  const endTime = process.hrtime.bigint();
  const compileTime = Number(endTime - startTime) / 1e6;
  logger.debug(`Tiktoken WASM compilation took ${compileTime.toFixed(2)}ms`);

  return compiledModule;
};
