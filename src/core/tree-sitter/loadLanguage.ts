import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import Parser from 'web-tree-sitter';

const require = createRequire(import.meta.url);

export async function loadLanguage(langName: string): Promise<Parser.Language> {
  if (!langName) {
    throw new Error('Invalid language name');
  }

  try {
    const wasmPath = await getWasmPath(langName);
    return await Parser.Language.load(wasmPath);
  } catch (error: any) {
    throw new Error(`Failed to load language ${langName}: ${error.message}`);
  }
}

async function getWasmPath(langName: string): Promise<string> {
  const wasmPath = require.resolve(`tree-sitter-wasms/out/tree-sitter-${langName}.wasm`);
  try {
    await fs.access(wasmPath);
    return wasmPath;
  } catch {
    throw new Error(`WASM file not found for language ${langName}: ${wasmPath}`);
  }
}
