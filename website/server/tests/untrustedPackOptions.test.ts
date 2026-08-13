import { describe, expect, test } from 'vitest';
import { buildUntrustedPackCliOptions } from '../src/domains/pack/utils/untrustedPackOptions.js';
import type { PackOptions } from '../src/types.js';

describe('buildUntrustedPackCliOptions', () => {
  const base = { outputFilePath: 'out.txt', format: 'xml', options: {} as PackOptions };

  test.each([{ securityCheck: true }, { securityCheck: false }])(
    'always sets skipLocalConfig (securityCheck: $securityCheck)',
    ({ securityCheck }) => {
      // The whole point of routing both pack paths through here: neither of them
      // gets to be the one that forgets.
      expect(buildUntrustedPackCliOptions({ ...base, securityCheck })).toMatchObject({ skipLocalConfig: true });
    },
  );

  test('leaves securityCheck to the caller', () => {
    // The one setting the ZIP and remote paths genuinely disagree on.
    expect(buildUntrustedPackCliOptions({ ...base, securityCheck: true }).securityCheck).toBe(true);
    expect(buildUntrustedPackCliOptions({ ...base, securityCheck: false }).securityCheck).toBe(false);
  });

  test('maps the request-level pack options through', () => {
    const options: PackOptions = {
      removeComments: true,
      removeEmptyLines: true,
      showLineNumbers: true,
      fileSummary: false,
      directoryStructure: false,
      includePatterns: 'src/**',
      ignorePatterns: 'dist/**',
      outputParsable: true,
      compress: true,
    };

    expect(buildUntrustedPackCliOptions({ ...base, options, securityCheck: true })).toMatchObject({
      output: 'out.txt',
      style: 'xml',
      parsableStyle: true,
      removeComments: true,
      removeEmptyLines: true,
      outputShowLineNumbers: true,
      fileSummary: false,
      directoryStructure: false,
      compress: true,
      include: 'src/**',
      ignore: 'dist/**',
      quiet: true,
      topFilesLen: 10,
    });
  });
});
