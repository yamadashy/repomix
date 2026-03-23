import type { RenderContext } from '../outputGeneratorTypes.js';

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

export const renderPlain = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}

${PLAIN_LONG_SEPARATOR}
File Summary
${PLAIN_LONG_SEPARATOR}

Purpose:
--------
${ctx.summaryPurpose}

File Format:
------------
${ctx.summaryFileFormat}
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
${ctx.summaryUsageGuidelines}

Notes:
------
${ctx.summaryNotes}

`,
    );
  }

  if (ctx.headerText) {
    parts.push(`
${PLAIN_LONG_SEPARATOR}
User Provided Header
${PLAIN_LONG_SEPARATOR}
${ctx.headerText}

`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}
Directory Structure
${PLAIN_LONG_SEPARATOR}
${ctx.treeString}

`);
  }

  if (ctx.filesEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}
Files
${PLAIN_LONG_SEPARATOR}

`);
    for (const file of ctx.processedFiles) {
      parts.push(`${PLAIN_SEPARATOR}
File: ${file.path}
${PLAIN_SEPARATOR}
${file.content}

`);
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}
Git Diffs
${PLAIN_LONG_SEPARATOR}
${PLAIN_SEPARATOR}
${ctx.gitDiffWorkTree ?? ''}
${PLAIN_SEPARATOR}

${PLAIN_SEPARATOR}
Git Diffs Staged
${PLAIN_SEPARATOR}
${ctx.gitDiffStaged ?? ''}

`);
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push(`${PLAIN_LONG_SEPARATOR}
Git Logs
${PLAIN_LONG_SEPARATOR}
`);
    for (const commit of ctx.gitLogCommits) {
      parts.push(`${PLAIN_SEPARATOR}
Date: ${commit.date}
Message: ${commit.message}
Files:
`);
      for (const file of commit.files) {
        parts.push(`  - ${file}\n`);
      }
      parts.push(`${PLAIN_SEPARATOR}

`);
    }
    parts.push('\n');
  }

  if (ctx.instruction) {
    parts.push(`${PLAIN_LONG_SEPARATOR}
Instruction
${PLAIN_LONG_SEPARATOR}
${ctx.instruction}`);
  }

  parts.push(`
${PLAIN_LONG_SEPARATOR}
End of Codebase
${PLAIN_LONG_SEPARATOR}`);

  return parts.join('');
};
