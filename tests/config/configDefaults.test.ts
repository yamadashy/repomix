import { describe, expect, test } from 'vitest';
import { defaultConfig, defaultFilePathMap, OUTPUT_STYLES } from '../../src/config/configDefaults.js';
import { repomixConfigDefaultSchema } from '../../src/config/configSchema.js';

describe('configDefaults', () => {
  // The plain-object defaultConfig is duplicated outside the zod schema so that
  // CLI startup can avoid loading zod. Verify the two stay in sync, otherwise a
  // future schema change could silently break the CLI's default behavior.
  test('defaultConfig matches the values produced by repomixConfigDefaultSchema', () => {
    // The skeleton below intentionally enumerates every nested object that the
    // schema declares. Zod v4 does not auto-fill nested defaults when an outer
    // object is omitted, so each section (input/output/output.git/ignore/etc.)
    // must be present as `{}` for the schema's `.default(...)` clauses to take
    // effect. If a future schema adds a new required nested section, this
    // skeleton must be extended too — otherwise zod will throw a parse error
    // here, surfacing the drift before runtime.
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
