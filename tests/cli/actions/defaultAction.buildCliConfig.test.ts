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

  describe('git log diff format flags (--git- prefix)', () => {
    it('should map --git-stat to commitPatchDetail stat', () => {
      const options: CliOptions = { gitStat: true };
      const result = buildCliConfig(options);
      expect(result.output?.git?.commitPatchDetail).toBe('stat');
      expect(result.output?.git?.includeCommitPatches).toBe(true);
      expect(result.output?.git?.includeLogs).toBe(true);
    });

    it('should map --git-patch to commitPatchDetail patch', () => {
      const options: CliOptions = { gitPatch: true };
      const result = buildCliConfig(options);
      expect(result.output?.git?.commitPatchDetail).toBe('patch');
      expect(result.output?.git?.includeCommitPatches).toBe(true);
    });

    it('should map --git-name-only to commitPatchDetail name-only', () => {
      const options: CliOptions = { gitNameOnly: true };
      const result = buildCliConfig(options);
      expect(result.output?.git?.commitPatchDetail).toBe('name-only');
    });

    it('should map --git-name-status to commitPatchDetail name-status', () => {
      const options: CliOptions = { gitNameStatus: true };
      const result = buildCliConfig(options);
      expect(result.output?.git?.commitPatchDetail).toBe('name-status');
    });

    it('should map --git-graph to includeCommitGraph', () => {
      const options: CliOptions = { gitGraph: true };
      const result = buildCliConfig(options);
      expect(result.output?.git?.includeCommitGraph).toBe(true);
      expect(result.output?.git?.includeLogs).toBe(true);
    });

    it('should map --git-summary to includeSummary', () => {
      const options: CliOptions = { gitSummary: true };
      const result = buildCliConfig(options);
      expect(result.output?.git?.includeSummary).toBe(true);
      expect(result.output?.git?.includeLogs).toBe(true);
    });

    it('should throw when multiple diff format flags are used', () => {
      const options: CliOptions = { gitStat: true, gitPatch: true };
      expect(() => buildCliConfig(options)).toThrow('Only one git log diff format flag can be used at a time');
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
});
