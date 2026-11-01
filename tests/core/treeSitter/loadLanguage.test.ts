import { describe, expect, it, vi } from 'vitest';
import type { Language } from 'web-tree-sitter';
import { loadLanguage } from '../../../src/core/treeSitter/loadLanguage.js';

const createDeps = () => ({
  access: vi.fn<(filePath: string) => Promise<void>>(),
  resolveModule: (specifier: string) => `/mock/path/${specifier}`,
  loadLanguageWasm: vi.fn<(wasmPath: string) => Promise<Language>>(),
});

describe('loadLanguage', () => {
  it('should throw error for empty language name', async () => {
    await expect(loadLanguage('', createDeps())).rejects.toThrow('Invalid language name');
  });

  it('should load language successfully', async () => {
    const deps = createDeps();
    deps.access.mockResolvedValue(undefined);
    deps.loadLanguageWasm.mockResolvedValue({ success: true } as unknown as Language);

    await loadLanguage('javascript', deps);

    expect(deps.access).toHaveBeenCalledWith('/mock/path/@repomix/tree-sitter-wasms/out/tree-sitter-javascript.wasm');
    expect(deps.loadLanguageWasm).toHaveBeenCalledWith(
      '/mock/path/@repomix/tree-sitter-wasms/out/tree-sitter-javascript.wasm',
    );
  });

  it('should throw error when WASM file is not found', async () => {
    const deps = createDeps();
    deps.access.mockRejectedValue(new Error('File not found'));

    await expect(loadLanguage('javascript', deps)).rejects.toThrow(
      'WASM file not found for language javascript: /mock/path/@repomix/tree-sitter-wasms/out/tree-sitter-javascript.wasm',
    );
  });

  it('should handle language load error', async () => {
    const deps = createDeps();
    deps.access.mockResolvedValue(undefined);
    deps.loadLanguageWasm.mockRejectedValue(new Error('Load failed'));

    await expect(loadLanguage('javascript', deps)).rejects.toThrow('Failed to load language javascript: Load failed');
  });
});
