import { getDiff } from './gitHandle.js';

export const getWorkTreeDiff = async (
  directory: string,
  deps = {
    getDiff,
  },
): Promise<string> => {
  return deps.getDiff(directory, []);
};
