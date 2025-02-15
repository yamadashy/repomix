import { beforeAll, describe, expect, it, vi } from 'vitest';
import Parser from 'web-tree-sitter';
import { LanguageParser } from './../../../src/core/tree-sitter/LanguageParser.js';
// Mock external modules
vi.mock('web-tree-sitter');
describe('LanguageParser', () => {
  let parser: LanguageParser;

  beforeAll(() => {
    parser = new LanguageParser();
  });

  describe('guessTheLang', () => {
    it('should return the correct language based on file extension', () => {
      const filePath = 'file.js';
      const lang = parser.guessTheLang(filePath);

      expect(lang).toBe('javascript');
    });

    it('should return undefined for unsupported extensions', () => {
      const filePath = 'file.txt';
      const lang = parser.guessTheLang(filePath);

      expect(lang).toBeUndefined();
    });
  });
});
