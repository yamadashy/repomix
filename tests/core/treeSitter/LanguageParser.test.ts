import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { LanguageParser } from '../../../src/core/treeSitter/languageParser.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

describe('LanguageParser', () => {
  let parser: LanguageParser;

  beforeAll(() => {
    parser = new LanguageParser();
  });

  describe('guessTheLang', () => {
    it('should return the correct language based on file extension', () => {
      const testCases = [
        { filePath: 'file.js', expected: 'javascript' },
        { filePath: 'file.ts', expected: 'typescript' },
        { filePath: 'file.sol', expected: 'solidity' },
        { filePath: 'Contract.sol', expected: 'solidity' },
        { filePath: 'path/to/MyContract.sol', expected: 'solidity' },
      ];

      for (const { filePath, expected } of testCases) {
        const lang = parser.guessTheLang(filePath);
        expect(lang).toBe(expected);
      }
    });

    it('should return undefined for unsupported extensions', () => {
      const filePath = 'file.txt';
      const lang = parser.guessTheLang(filePath);

      expect(lang).toBeUndefined();
    });
  });

  describe('init / dispose', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('throws RepomixError when used before init', async () => {
      const fresh = new LanguageParser();
      const error = await fresh.getParserForLang('javascript').catch((e) => e);
      expect(error).toBeInstanceOf(RepomixError);
      expect((error as Error).message).toMatch(/not initialized/);
    });

    it('init() is idempotent — second call short-circuits', async () => {
      const initSpy = vi.spyOn(Parser, 'init').mockResolvedValue(undefined);
      const target = new LanguageParser();

      await target.init();
      await target.init();

      expect(initSpy).toHaveBeenCalledTimes(1);
      await target.dispose();
    });

    it('wraps Parser.init() failures as RepomixError', async () => {
      vi.spyOn(Parser, 'init').mockRejectedValue(new Error('wasm load failed'));
      const target = new LanguageParser();

      await expect(target.init()).rejects.toBeInstanceOf(RepomixError);
      await expect(target.init()).rejects.toThrow(/Failed to initialize parser.*wasm load failed/);
    });

    it('dispose() resets state so subsequent calls require re-init', async () => {
      vi.spyOn(Parser, 'init').mockResolvedValue(undefined);
      const target = new LanguageParser();
      await target.init();

      await target.dispose();

      // After dispose, the parser should look fresh again.
      await expect(target.getParserForLang('javascript')).rejects.toThrow(/not initialized/);
    });
  });
});
