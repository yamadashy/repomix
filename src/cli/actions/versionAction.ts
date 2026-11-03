import { getVersion } from '../../core/file/packageJsonParse.js';
import { logger } from '../../shared/logger.js';

export const runVersionAction = async (
  deps = {
    getVersion,
  },
): Promise<void> => {
  const version = await deps.getVersion();
  logger.log(version);
};
