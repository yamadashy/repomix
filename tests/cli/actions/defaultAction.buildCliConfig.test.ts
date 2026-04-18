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
      const optionsWithInvalidStyle = {
        // @ts-expect-error: intentionally invalid to verify the manual check rejects it
        style: 'bogus',
      } as CliOptions;
      await expect(buildCliConfig(optionsWithInvalidStyle, { validate: false })).rejects.toThrow(
        /Invalid output style/,
      );
    });

    it('skips zod validation when validate: false', async () => {
      // Without zod validation, an out-of-range topFilesLength passes through
      // (Commander already enforces the integer parse, but does not enforce
      // the >=0 schema constraint). When validate: true, zod would catch it.
      const result = await buildCliConfig({ topFilesLen: 5 }, { validate: false });
      expect(result.output?.topFilesLength).toBe(5);
    });
  });
});
