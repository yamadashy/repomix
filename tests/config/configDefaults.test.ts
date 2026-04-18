import { describe, expect, test } from 'vitest';
import { defaultConfig, defaultFilePathMap, OUTPUT_STYLES } from '../../src/config/configDefaults.js';
import { repomixConfigDefaultSchema } from '../../src/config/configSchema.js';

describe('configDefaults', () => {
  // The plain-object defaultConfig is duplicated outside the zod schema so that
  // CLI startup can avoid loading zod. Verify the two stay in sync, otherwise a
  // future schema change could silently break the CLI's default behavior.
  test('defaultConfig matches the values produced by repomixConfigDefaultSchema', () => {
    const schemaParsed = repomixConfigDefaultSchema.parse({
      input: {},
      output: { git: {} },
      ignore: {},
      security: {},
      tokenCount: {},
    });

    expect(defaultConfig).toEqual(schemaParsed);
  });

  test('OUTPUT_STYLES contains the expected styles', () => {
    expect(OUTPUT_STYLES).toEqual(['xml', 'markdown', 'json', 'plain']);
  });

  test('defaultFilePathMap covers every output style', () => {
    for (const style of OUTPUT_STYLES) {
      expect(defaultFilePathMap[style]).toBeTypeOf('string');
      expect(defaultFilePathMap[style].length).toBeGreaterThan(0);
    }
  });
});
