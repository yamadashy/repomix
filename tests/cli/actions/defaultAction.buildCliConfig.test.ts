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
    it('should handle plain style', () => {
      const options: CliOptions = {
        style: 'plain',
      };

      const result = buildCliConfig(options);

      expect(result.output?.style).toBe('plain');
    });

    it('should handle xml style', () => {
      const options: CliOptions = {
        style: 'xml',
      };

      const result = buildCliConfig(options);

      expect(result.output?.style).toBe('xml');
    });

    it('should handle markdown style', () => {
      const options: CliOptions = {
        style: 'markdown',
      };

      const result = buildCliConfig(options);

      expect(result.output?.style).toBe('markdown');
    });

    it('should handle json style', () => {
      const options: CliOptions = {
        style: 'json',
      };

      const result = buildCliConfig(options);

      expect(result.output?.style).toBe('json');
    });
  });
});
