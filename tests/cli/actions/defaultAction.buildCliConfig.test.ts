import { describe, expect, it } from 'vitest';
import { buildCliConfig } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';

describe('buildCliConfig', () => {
  describe('tokenCountTree option', () => {
    it('should handle boolean tokenCountTree', () => {
      const options: CliOptions = {
        tokenCountTree: true,
      };

      const result = buildCliConfig(options);

      expect(result.output?.tokenCountTree).toBe(true);
    });

    it('should handle numeric tokenCountTree', () => {
      const options: CliOptions = {
        tokenCountTree: 100,
      };

      const result = buildCliConfig(options);

      expect(result.output?.tokenCountTree).toBe(100);
    });
  });

  describe('splitOutput option', () => {
    it('should map splitOutput (bytes) into config', () => {
      const options: CliOptions = {
        splitOutput: 1024,
      };

      const result = buildCliConfig(options);

      expect(result.output?.splitOutput).toBe(1024);
    });
  });

  describe('tokenBudget option', () => {
    it('should map tokenBudget into config', () => {
      const options: CliOptions = {
        tokenBudget: 180000,
      };

      const result = buildCliConfig(options);

      expect(result.output?.tokenBudget).toBe(180000);
    });

    it('should leave tokenBudget undefined when not provided', () => {
      const result = buildCliConfig({});

      expect(result.output?.tokenBudget).toBeUndefined();
    });
  });
});
