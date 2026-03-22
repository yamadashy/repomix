import type { RenderContext } from '../outputGeneratorTypes.js';

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

export const renderPlain = (ctx: Partial<RenderContext>): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      ctx.generationHeader ?? '',
      `\n\n${PLAIN_LONG_SEPARATOR}\nFile Summary\n${PLAIN_LONG_SEPARATOR}\n\nPurpose:\n--------\n`,
      ctx.summaryPurpose ?? '',
      `\n\nFile Format:\n------------\n`,
      ctx.summaryFileFormat ?? '',
      `\n5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
`,
      ctx.summaryUsageGuidelines ?? '',
      `\n\nNotes:\n------\n`,
      ctx.summaryNotes ?? '',
      '\n',
    );
  }

  if (ctx.headerText) {
    parts.push(`\n\n${PLAIN_LONG_SEPARATOR}\nUser Provided Header\n${PLAIN_LONG_SEPARATOR}\n`, ctx.headerText, '\n');
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nDirectory Structure\n${PLAIN_LONG_SEPARATOR}\n`, ctx.treeString ?? '', '\n');
  }

  if (ctx.filesEnabled) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nFiles\n${PLAIN_LONG_SEPARATOR}\n`);
    for (const file of ctx.processedFiles ?? []) {
      parts.push(`\n${PLAIN_SEPARATOR}\nFile: `, file.path, `\n${PLAIN_SEPARATOR}\n`, file.content, '\n');
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push(
      `\n${PLAIN_LONG_SEPARATOR}\nGit Diffs\n${PLAIN_LONG_SEPARATOR}\n${PLAIN_SEPARATOR}\n`,
      ctx.gitDiffWorkTree ?? '',
      `\n${PLAIN_SEPARATOR}\n\n${PLAIN_SEPARATOR}\nGit Diffs Staged\n${PLAIN_SEPARATOR}\n`,
      ctx.gitDiffStaged ?? '',
      '\n',
    );
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nGit Logs\n${PLAIN_LONG_SEPARATOR}\n`);
    for (const commit of ctx.gitLogCommits) {
      parts.push(`${PLAIN_SEPARATOR}\nDate: `, commit.date, '\nMessage: ', commit.message, '\nFiles:\n');
      for (const file of commit.files) {
        parts.push('  - ', file, '\n');
      }
      parts.push(`${PLAIN_SEPARATOR}\n\n`);
    }
  }

  if (ctx.instruction) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nInstruction\n${PLAIN_LONG_SEPARATOR}\n`, ctx.instruction);
  }

  parts.push(`\n\n${PLAIN_LONG_SEPARATOR}\nEnd of Codebase\n${PLAIN_LONG_SEPARATOR}\n`);

  return parts.join('');
};
