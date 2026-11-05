import { mergeConfigs } from '../../src/config/configLoad.js';
import type { RepomixConfigFile, RepomixConfigMerged, RepomixOutputStyle } from '../../src/config/configSchema.js';

/**
 * Build a fully merged config for the real-pipeline pack spec tests: the given
 * output file and style, with every git feature off so the spec never shells out
 * to git against its tmpdir fixture.
 */
export const buildPackSpecConfig = (
  cwd: string,
  outputFilePath: string,
  style: RepomixOutputStyle = 'xml',
  overrides: Partial<RepomixConfigFile> = {},
): RepomixConfigMerged =>
  mergeConfigs(cwd, overrides, {
    output: {
      filePath: outputFilePath,
      style,
      git: { sortByChanges: false, includeDiffs: false, includeLogs: false },
    },
  });
