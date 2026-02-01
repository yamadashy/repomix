import { describe, expect, test } from 'vitest';
import { generateCliCommand } from '../../website/client/components/utils/cliCommand.js';
import type { PackOptions } from '../../website/client/composables/usePackOptions.js';

const createOptions = (overrides: Partial<PackOptions> = {}): PackOptions => ({
  format: 'xml',
  removeComments: false,
  removeEmptyLines: false,
  showLineNumbers: false,
  fileSummary: true,
  directoryStructure: true,
  includePatterns: '',
  ignorePatterns: '',
  outputParsable: false,
  compress: false,
  ...overrides,
});

describe('generateCliCommand', () => {
  test('should generate basic command without options', () => {
    expect(generateCliCommand(undefined)).toBe('npx repomix');
  });

  test('should add --remote for valid GitHub shorthand', () => {
    const result = generateCliCommand('yamadashy/repomix');
    expect(result).toBe("npx repomix --remote 'yamadashy/repomix'");
  });

  test('should add --remote for valid URL', () => {
    const result = generateCliCommand('https://github.com/yamadashy/repomix');
    expect(result).toBe("npx repomix --remote 'https://github.com/yamadashy/repomix'");
  });

  test('should not add --remote for uploaded file names', () => {
    const result = generateCliCommand('project.zip');
    expect(result).toBe('npx repomix');
  });

  test('should add format option when not default xml', () => {
    const result = generateCliCommand(undefined, createOptions({ format: 'markdown' }));
    expect(result).toBe('npx repomix --style markdown');
  });

  test('should not add format option when xml (default)', () => {
    const result = generateCliCommand(undefined, createOptions({ format: 'xml' }));
    expect(result).toBe('npx repomix');
  });

  test('should add boolean flags', () => {
    const result = generateCliCommand(
      undefined,
      createOptions({
        removeComments: true,
        removeEmptyLines: true,
        showLineNumbers: true,
        outputParsable: true,
        compress: true,
      }),
    );
    expect(result).toBe(
      'npx repomix --remove-comments --remove-empty-lines --output-show-line-numbers --parsable-style --compress',
    );
  });

  test('should add no- flags for disabled defaults', () => {
    const result = generateCliCommand(
      undefined,
      createOptions({
        fileSummary: false,
        directoryStructure: false,
      }),
    );
    expect(result).toBe('npx repomix --no-file-summary --no-directory-structure');
  });

  test('should shell-escape include and ignore patterns', () => {
    const result = generateCliCommand(
      undefined,
      createOptions({
        includePatterns: '**/*.ts',
        ignorePatterns: "test's dir",
      }),
    );
    expect(result).toBe("npx repomix --include '**/*.ts' --ignore 'test'\\''s dir'");
  });

  test('should skip empty patterns', () => {
    const result = generateCliCommand(
      undefined,
      createOptions({
        includePatterns: '  ',
        ignorePatterns: '',
      }),
    );
    expect(result).toBe('npx repomix');
  });

  test('should combine all options', () => {
    const result = generateCliCommand(
      'yamadashy/repomix',
      createOptions({
        format: 'markdown',
        removeComments: true,
        compress: true,
        fileSummary: false,
        includePatterns: 'src/**',
      }),
    );
    expect(result).toBe(
      "npx repomix --remote 'yamadashy/repomix' --style markdown --remove-comments --compress --no-file-summary --include 'src/**'",
    );
  });

  test('should escape shell metacharacters in repository URL', () => {
    const result = generateCliCommand('https://example.com/repo;rm -rf /', undefined);
    expect(result).toBe("npx repomix --remote 'https://example.com/repo;rm -rf /'");
  });
});
