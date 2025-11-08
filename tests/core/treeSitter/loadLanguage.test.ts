import fs from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { Language } from 'web-tree-sitter';
import { loadLanguage } from '../../../src/core/treeSitter/loadLanguage.js';

vi.mock('node:fs/promises');
vi.mock('web-tree-sitter', () => ({
  Language: {
    load: vi.fn(),
  },
}));
vi.mock('node:module', () => ({
  createRequire: () => ({
    resolve: (path: string) => `/mock/path/${path}`,
  }),
}));

describe('loadLanguage', () => {
  it('should throw error for empty language name', async () => {
    await expect(loadLanguage('')).rejects.toThrow('Invalid language name');
  });

  it('should load language successfully', async () => {
    const mockAccess = vi.mocked(fs.access);
    mockAccess.mockResolvedValue(undefined);

    const mockLoadLanguage = vi.fn().mockResolvedValue({ success: true });
    Language.load = mockLoadLanguage;

    await loadLanguage('javascript');

    expect(mockAccess).toHaveBeenCalledWith('/mock/path/@repomix/tree-sitter-wasms/out/tree-sitter-javascript.wasm');
    expect(mockLoadLanguage).toHaveBeenCalledWith(
      '/mock/path/@repomix/tree-sitter-wasms/out/tree-sitter-javascript.wasm',
    );
  });

  it('should throw error when WASM file is not found', async () => {
    const mockAccess = vi.mocked(fs.access);
    mockAccess.mockRejectedValue(new Error('File not found'));

    await expect(loadLanguage('javascript')).rejects.toThrow(
      'WASM file not found for language javascript: /mock/path/@repomix/tree-sitter-wasms/out/tree-sitter-javascript.wasm',
    );
  });

  it('should handle language load error', async () => {
    const mockAccess = vi.mocked(fs.access);
    mockAccess.mockResolvedValue(undefined);

    const mockLoadLanguage = vi.fn().mockRejectedValue(new Error('Load failed'));
    Language.load = mockLoadLanguage;

    await expect(loadLanguage('javascript')).rejects.toThrow('Failed to load language javascript: Load failed');
  });
});
