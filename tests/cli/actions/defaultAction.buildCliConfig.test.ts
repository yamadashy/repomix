import { describe, expect, it } from 'vitest';
import { buildCliConfig } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import { mergeConfigs } from '../../../src/config/configLoad.js';
import type { RepomixConfigCli } from '../../../src/config/configSchema.js';
import { RepomixConfigValidationError } from '../../../src/shared/errorHandle.js';

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

  describe('option to config mapping', () => {
    it.each<[string, CliOptions, RepomixConfigCli]>([
      ['--output', { output: 'out.xml' }, { output: { filePath: 'out.xml' } }],
      ['--top-files-len', { topFilesLen: 10 }, { output: { topFilesLength: 10 } }],
      ['--top-files-len 0', { topFilesLen: 0 }, { output: { topFilesLength: 0 } }],
      ['--output-show-line-numbers', { outputShowLineNumbers: true }, { output: { showLineNumbers: true } }],
      ['--copy', { copy: true }, { output: { copyToClipboard: true } }],
      ['--parsable-style', { parsableStyle: true }, { output: { parsableStyle: true } }],
      ['--stdout', { stdout: true }, { output: { stdout: true } }],
      ['--no-directory-structure', { directoryStructure: false }, { output: { directoryStructure: false } }],
      ['--no-files', { files: false }, { output: { files: false } }],
      ['--remove-empty-lines', { removeEmptyLines: true }, { output: { removeEmptyLines: true } }],
      ['--truncate-base64', { truncateBase64: true }, { output: { truncateBase64: true } }],
      ['--header-text', { headerText: 'Hello' }, { output: { headerText: 'Hello' } }],
      ['--header-text with empty string', { headerText: '' }, { output: { headerText: '' } }],
      ['--compress', { compress: true }, { output: { compress: true } }],
      ['--token-count-encoding', { tokenCountEncoding: 'cl100k_base' }, { tokenCount: { encoding: 'cl100k_base' } }],
      [
        '--instruction-file-path',
        { instructionFilePath: 'instructions.md' },
        { output: { instructionFilePath: 'instructions.md' } },
      ],
      ['--include-empty-directories', { includeEmptyDirectories: true }, { output: { includeEmptyDirectories: true } }],
      [
        '--include-full-directory-structure',
        { includeFullDirectoryStructure: true },
        { output: { includeFullDirectoryStructure: true } },
      ],
      ['--no-git-sort-by-changes', { gitSortByChanges: false }, { output: { git: { sortByChanges: false } } }],
      ['--include-diffs', { includeDiffs: true }, { output: { git: { includeDiffs: true } } }],
      ['--include-logs', { includeLogs: true }, { output: { git: { includeLogs: true } } }],
      ['--include-logs-count alone', { includeLogsCount: 20 }, { output: { git: { includeLogsCount: 20 } } }],
      [
        '--include-logs with --include-logs-count',
        { includeLogs: true, includeLogsCount: 5 },
        { output: { git: { includeLogs: true, includeLogsCount: 5 } } },
      ],
      ['enableFileProcessors (internal)', { enableFileProcessors: false }, { enableFileProcessors: false }],
    ])('should map %s', (_label, options, expected) => {
      expect(buildCliConfig(options)).toEqual(expected);
    });

    it.each<[string, CliOptions]>([
      ['--copy false', { copy: false }],
      ['directoryStructure true (Commander default)', { directoryStructure: true }],
      ['files true (Commander default)', { files: true }],
      ['gitSortByChanges true (Commander default)', { gitSortByChanges: true }],
      ['includeDiffs false', { includeDiffs: false }],
      ['includeLogs false', { includeLogs: false }],
      ['empty tokenCountEncoding', { tokenCountEncoding: '' }],
    ])('should not set anything for %s', (_label, options) => {
      expect(buildCliConfig(options)).toEqual({});
    });

    it('should lowercase --style and --output-file-path-style values', () => {
      const result = buildCliConfig({
        style: 'MarkDown',
        outputFilePathStyle: 'CWD-Relative',
      } as unknown as CliOptions);

      expect(result.output?.style).toBe('markdown');
      expect(result.output?.filePathStyle).toBe('cwd-relative');
    });

    it('should merge git sub-options from several flags into one git object', () => {
      const result = buildCliConfig({
        gitSortByChanges: false,
        includeDiffs: true,
        includeLogs: true,
        includeLogsCount: 3,
      });

      expect(result.output?.git).toEqual({
        sortByChanges: false,
        includeDiffs: true,
        includeLogs: true,
        includeLogsCount: 3,
      });
    });

    it('should combine output-related flags without dropping earlier ones', () => {
      const result = buildCliConfig({
        output: 'out.md',
        topFilesLen: 3,
        outputShowLineNumbers: true,
        fileSummary: false,
        directoryStructure: false,
        files: false,
        compress: true,
      });

      expect(result).toEqual({
        output: {
          filePath: 'out.md',
          topFilesLength: 3,
          showLineNumbers: true,
          fileSummary: false,
          directoryStructure: false,
          files: false,
          compress: true,
        },
      });
    });

    it('should reject an unsupported --style with a validation error', () => {
      const build = () => buildCliConfig({ style: 'yaml' } as unknown as CliOptions);

      expect(build).toThrow(RepomixConfigValidationError);
      expect(build).toThrow(/Invalid cli arguments[\s\S]*output\.style/);
    });
  });
});
