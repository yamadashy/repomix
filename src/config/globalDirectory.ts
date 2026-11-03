import os from 'node:os';
import path from 'node:path';

export const getGlobalDirectory = (
  deps = {
    homedir: os.homedir,
    platform: process.platform,
    env: process.env,
  },
) => {
  if (deps.platform === 'win32') {
    const localAppData = deps.env.LOCALAPPDATA || path.join(deps.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'Repomix');
  }

  if (deps.env.XDG_CONFIG_HOME) {
    return path.join(deps.env.XDG_CONFIG_HOME, 'repomix');
  }

  return path.join(deps.homedir(), '.config', 'repomix');
};
