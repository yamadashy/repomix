import { describe, expect, it } from 'vitest';
import { buildCliConfig } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import { mergeConfigs } from '../../../src/config/configLoad.js';

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

  describe('outputPatterns option (internal MCP field)', () => {
    it('should map outputPatterns into output.patterns', () => {
      const options: CliOptions = {
        outputPatterns: [
          { pattern: 'src/core/**' },
          { pattern: 'docs/**/*', compress: true },
          { pattern: 'website/**/*', directoryStructureOnly: true },
        ],
      };

      const result = buildCliConfig(options);

      expect(result.output?.patterns).toEqual([
        { pattern: 'src/core/**' },
        { pattern: 'docs/**/*', compress: true },
        { pattern: 'website/**/*', directoryStructureOnly: true },
      ]);
    });

    it('should leave patterns undefined when outputPatterns is not provided', () => {
      const result = buildCliConfig({});

      expect(result.output?.patterns).toBeUndefined();
    });
  });

  describe('securityCheck option', () => {
    it('should map an explicit securityCheck: true into config', () => {
      const result = buildCliConfig({ securityCheck: true });

      expect(result.security?.enableSecurityCheck).toBe(true);
    });

    it('should leave security undefined when securityCheck is not provided', () => {
      const result = buildCliConfig({});

      expect(result.security).toBeUndefined();
    });

    it('should let an explicit securityCheck: true override a config file that disables it', () => {
      // MCP pack tools pass securityCheck: true; a workspace config must not turn the scan off
      const merged = mergeConfigs(
        process.cwd(),
        { security: { enableSecurityCheck: false } },
        buildCliConfig({ securityCheck: true }),
      );

      expect(merged.security.enableSecurityCheck).toBe(true);
    });

    it('should let the config file decide when securityCheck is not provided', () => {
      const merged = mergeConfigs(process.cwd(), { security: { enableSecurityCheck: false } }, buildCliConfig({}));

      expect(merged.security.enableSecurityCheck).toBe(false);
    });
  });
});
