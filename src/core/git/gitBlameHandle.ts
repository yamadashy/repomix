import { logger } from '../../shared/logger.js';
import { execGitBlame } from './gitCommand.js';
import { isGitRepository } from './gitRepositoryHandle.js';

/**
 * Formats the output of 'git blame --porcelain' into readable annotated lines.
 * @param blameOutput - Raw output from 'git blame --porcelain'
 * @returns Formatted string with each line annotated by author and date.
 */
function formatGitBlame(blameOutput: string): string {
  const lines = blameOutput.split('\n');
  const formattedLines: string[] = [];
  let currentAuthor = 'N/A';
  let currentDate = 'N/A';

  for (const line of lines) {
    if (!line) continue;

    if (/^[a-f0-9]{40}/.test(line)) {
      continue;
    }

    if (line.startsWith('author ')) {
      currentAuthor = line.substring('author '.length);
      continue;
    }
    if (line.startsWith('author-time ')) {
      const timestamp = parseInt(line.substring('author-time '.length), 10);
      if (!Number.isNaN(timestamp)) {
        currentDate = new Date(timestamp * 1000).toISOString().split('T')[0];
      }
      continue;
    }

    if (line.startsWith('\t')) {
      const codeLine = line.substring(1);
      const formattedLine = codeLine
        ? `[${currentAuthor} ${currentDate}] ${codeLine}`
        : `[${currentAuthor} ${currentDate}]`;
      formattedLines.push(formattedLine);
    }
  }

  return formattedLines.join('\n');
}

/**
 * Retrieves and formats git blame information for a file
 * @param directory - The repository directory
 * @param filePath - Path to the file
 * @param deps - Dependencies
 * @returns Formatted blame string or null if failed/skipped
 */
export const getGitBlame = async (
  directory: string,
  filePath: string,
  deps = {
    execGitBlame,
    isGitRepository,
  },
): Promise<string | null> => {
  if (!(await deps.isGitRepository(directory))) {
    logger.trace(`Directory ${directory} is not a git repository, skipping git blame`);
    return null;
  }

  try {
    const blameOutput = await deps.execGitBlame(directory, filePath);

    if (!blameOutput) {
      return null;
    }

    return formatGitBlame(blameOutput);
  } catch (error) {
    logger.trace(`Failed to get git blame for ${filePath}:`, (error as Error).message);
    return null;
  }
};
