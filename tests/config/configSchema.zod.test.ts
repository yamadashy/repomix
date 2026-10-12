import { describe, expect, test } from 'vitest';
import { repomixConfigFileSchema } from '../../src/config/configSchema.js';

describe('configSchema - Zod parsing behavior', () => {
  test('should parse config with only customPatterns', () => {
    const input = {
      ignore: {
        customPatterns: ['bin/'],
      },
    };

    const result = repomixConfigFileSchema.parse(input);

    // useDotIgnore should not be set when not provided in input
    expect(result.ignore?.useDotIgnore).toBeUndefined();
    expect(result.ignore?.useGitignore).toBeUndefined();
    expect(result.ignore?.useDefaultPatterns).toBeUndefined();
    expect(result.ignore?.customPatterns).toEqual(['bin/']);
  });

  test('should parse config with useDotIgnore explicitly set', () => {
    const input = {
      ignore: {
        useDotIgnore: true,
        customPatterns: ['bin/'],
      },
    };

    const result = repomixConfigFileSchema.parse(input);

    expect(result.ignore?.useDotIgnore).toBe(true);
    expect(result.ignore?.customPatterns).toEqual(['bin/']);
  });

  test('should parse empty config', () => {
    const input = {};

    const result = repomixConfigFileSchema.parse(input);

    expect(result.ignore).toBeUndefined();
  });
});
