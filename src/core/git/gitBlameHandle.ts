import { logger } from "../../shared/logger.js";
import { execGitBlame } from "./gitCommand.js";
import { isGitRepository } from "./gitRepositoryHandle.js";

function formatGitBlame(blameOutput: string): string {
    // Regex breakdown:
    // ^[a-f0-9]+          - Matches the commit hash at the start of the line (e.g., a2d3c5fed)
    // \s*                 - Matches optional whitespace
    // \((.+)              - Group 1: Matches the AUTHOR part (e.g., yamadashy, Kazuki Yamada)
    // \s+                 - Matches one or more spaces
    // (\d{4}-\d{2}-\d{2}) - Group 2: Matches the DATE part (e.g., 2025-02-17)
    // \s+                 - Matches one or more spaces
    // \d+\)               - Matches the line number inside the parenthesis (e.g., 1)
    // (.*)                - Group 3: Matches the CODE LINE part, including leading space
    const blameLineRegex = /^[a-f0-9]+\s*\((.+)\s+(\d{4}-\d{2}-\d{2})\s+\d+\)(.*)$/i;

    const lines = blameOutput.split('\n');
    const formattedLines: string[] = [];

    for (const line of lines) {
        const match = line.match(blameLineRegex);
        if (match) {
            const [, rawAuthor, date, codeLineRaw] = match;
            const author = rawAuthor.trim();
            const codeLine = codeLineRaw.startsWith(' ') ? codeLineRaw.substring(1) : codeLineRaw;

            formattedLines.push(`[${author} ${date}] ${codeLine}`);
        } else if (line.trim().length > 0) {
            formattedLines.push(`[N/A N/A] ${line.trim()}`);
        }
    }

    return formattedLines.join('\n');
}

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

    return formatGitBlame(blameOutput)
  } catch(error) {
    logger.trace(`Failed to get git blame for ${filePath}:`, (error as Error).message);
    return null;
  }
};
