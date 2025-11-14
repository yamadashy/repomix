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

  describe('style option', () => {
    it.each(['plain', 'xml', 'markdown', 'json'] as const)('should handle %s style', (style) => {
      const options: CliOptions = {
        style,
      };

      const result = buildCliConfig(options);

      expect(result.output?.style).toBe(style);
    });
  });
});
