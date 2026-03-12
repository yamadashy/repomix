import os from 'node:os';
import process from 'node:process';
import { defaultConfig, type RepomixConfigMerged } from '../../src/config/configSchema.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends readonly (infer U)[]
      ? readonly DeepPartial<U>[]
      : T[P] extends object
        ? DeepPartial<T[P]>
        : T[P];
};

export const createMockConfig = (config: DeepPartial<RepomixConfigMerged> = {}): RepomixConfigMerged => {
  return {
    cwd: config.cwd ?? process.cwd(),
    input: {
      ...defaultConfig.input,
      ...config.input,
    },
    output: {
      ...defaultConfig.output,
      ...config.output,
      git: {
        ...defaultConfig.output.git,
        ...config.output?.git,
      },
    },
    ignore: {
      ...defaultConfig.ignore,
      ...config.ignore,
      customPatterns: [...(defaultConfig.ignore.customPatterns || []), ...(config.ignore?.customPatterns || [])],
    },
    include: [...(defaultConfig.include || []), ...(config.include || [])],
    security: {
      ...defaultConfig.security,
      ...config.security,
    },
    tokenCount: {
      ...defaultConfig.tokenCount,
      ...config.tokenCount,
    },
    // CLI-only optional properties
    ...(config.skillGenerate !== undefined && { skillGenerate: config.skillGenerate }),
  };
};

export const isWindows = os.platform() === 'win32';
export const isMac = os.platform() === 'darwin';
export const isLinux = os.platform() === 'linux';
