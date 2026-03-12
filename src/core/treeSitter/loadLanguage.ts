import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Language } from 'web-tree-sitter';

const require = createRequire(import.meta.url);

/**
 * Custom WASM base path for bundled environments.
 * Set via REPOMIX_WASM_DIR environment variable or setWasmBasePath().
 * When set, WASM files are loaded from this directory instead of node_modules.
 */
let customWasmBasePath: string | null = null;

/**
 * Set a custom base path for WASM files.
 * Used in bundled environments where WASM files are copied to a custom location.
 */
export function setWasmBasePath(basePath: string): void {
  customWasmBasePath = basePath;
}

/**
 * Get the WASM base path from environment variable or custom setting.
 */
function getWasmBasePath(): string | null {
  return customWasmBasePath ?? process.env.REPOMIX_WASM_DIR ?? null;
}

export async function loadLanguage(langName: string): Promise<Language> {
  if (!langName) {
    throw new Error('Invalid language name');
  }

  try {
    const wasmPath = await getWasmPath(langName);
    return await Language.load(wasmPath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load language ${langName}: ${message}`);
  }
}

async function getWasmPath(langName: string): Promise<string> {
  const wasmBasePath = getWasmBasePath();

  let wasmPath: string;
  if (wasmBasePath) {
    // Use custom WASM path for bundled environments
    wasmPath = path.join(wasmBasePath, `tree-sitter-${langName}.wasm`);
  } else {
    // Use require.resolve for standard node_modules environments
    wasmPath = require.resolve(`@repomix/tree-sitter-wasms/out/tree-sitter-${langName}.wasm`);
  }

  try {
    await fs.access(wasmPath);
    return wasmPath;
  } catch {
    throw new Error(`WASM file not found for language ${langName}: ${wasmPath}`);
  }
}
