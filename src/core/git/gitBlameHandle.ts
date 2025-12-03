import { logger } from "../../shared/logger.js";
import { execGitBlame } from "./gitCommand.js";
import { isGitRepository } from "./gitRepositoryHandle.js";

export const getGitBlame = async (
  directory: string,
  filePath: string,
  deps = {
    execGitBlame,
    isGitRepository,
  },
): Promise<string | null> => {
  if (!(await deps.isGitRepository(directory))) {
    logger.trace(
      `Directory ${directory} is not a git repository, skipping git blame`,
    );
    return null;
  }

  try {
    const blameOutput = await deps.execGitBlame(directory, filePath)

    if (!blameOutput) {
      return null
    }

    return blameOutput
  } catch(error) {
    logger.trace(`Failed to get git blame for ${filePath}:`, (error as Error).message);
    return null;
  }
};
