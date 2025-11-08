import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Language } from 'web-tree-sitter';

const require = createRequire(import.meta.url);

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
  const wasmPath = require.resolve(`@repomix/tree-sitter-wasms/out/tree-sitter-${langName}.wasm`);
  try {
    await fs.access(wasmPath);
    return wasmPath;
  } catch {
    throw new Error(`WASM file not found for language ${langName}: ${wasmPath}`);
  }
}
