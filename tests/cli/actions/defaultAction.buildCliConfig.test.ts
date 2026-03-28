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
});
