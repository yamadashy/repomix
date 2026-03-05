import { beforeAll, describe, expect, it } from 'vitest';
import { LanguageParser } from '../../../src/core/treeSitter/languageParser.js';

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
        { filePath: 'file.tsx', expected: 'tsx' },
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
});
