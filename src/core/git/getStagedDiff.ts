import { getDiff } from './gitHandle.js';

export const getStagedDiff = async (
  directory: string,
  deps = {
    getDiff,
  },
): Promise<string> => {
  return deps.getDiff(directory, ['--cached']);
};
