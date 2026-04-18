import { describe, expect, it } from 'vitest';
import { buildCliConfig } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';

describe('buildCliConfig', () => {
  describe('tokenCountTree option', () => {
    it('should handle boolean tokenCountTree', async () => {
      const options: CliOptions = {
        tokenCountTree: true,
      };

      const result = await buildCliConfig(options);

      expect(result.output?.tokenCountTree).toBe(true);
    });

    it('should handle numeric tokenCountTree', async () => {
      const options: CliOptions = {
        tokenCountTree: 100,
      };

      const result = await buildCliConfig(options);

      expect(result.output?.tokenCountTree).toBe(100);
    });
  });

  describe('splitOutput option', () => {
    it('should map splitOutput (bytes) into config', async () => {
      const options: CliOptions = {
        splitOutput: 1024,
      };

      const result = await buildCliConfig(options);

      expect(result.output?.splitOutput).toBe(1024);
    });
  });

  describe('validation', () => {
    it('rejects invalid output style even when validate: false (manual check)', async () => {
      // The style enum is checked manually inside buildCliConfig because
      // Commander does not constrain --style to a fixed enum. So the rejection
      // happens regardless of the `validate` option.
      // Cast via `unknown` because `'bogus'` is intentionally outside the
      // RepomixOutputStyle enum and would otherwise fail the type check.
      const optionsWithInvalidStyle = { style: 'bogus' } as unknown as CliOptions;
      await expect(buildCliConfig(optionsWithInvalidStyle, { validate: false })).rejects.toThrow(
        /Invalid output style/,
      );
    });

    it('skips zod validation when validate: false', async () => {
      // `splitOutput` is constrained to `int().min(1)` in
      // repomixConfigBaseSchema (and thus repomixConfigCliSchema). With
      // validate=true zod rejects 0; with validate=false it passes through
      // unchecked, proving zod is genuinely skipped.
      const result = await buildCliConfig({ splitOutput: 0 }, { validate: false });
      expect(result.output?.splitOutput).toBe(0);
    });

    it('runs zod validation by default and rejects out-of-range splitOutput', async () => {
      // Companion to the above: with the default validate=true the same
      // out-of-range value is caught by zod, proving the option flips the
      // behavior rather than just one specific path skipping validation.
      await expect(buildCliConfig({ splitOutput: 0 })).rejects.toThrow();
    });
  });
});
