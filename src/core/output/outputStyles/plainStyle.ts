import type { RenderContext } from '../outputGeneratorTypes.js';

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

export const renderPlain = (ctx: Partial<RenderContext>): string => {
  const parts: string[] = [];

  // Leading newline (from template literal opening).
  parts.push('\n');

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader ?? ''}\n` +
        '\n' +
        `${PLAIN_LONG_SEPARATOR}\n` +
        'File Summary\n' +
        `${PLAIN_LONG_SEPARATOR}\n` +
        '\n' +
        'Purpose:\n' +
        '--------\n' +
        `${ctx.summaryPurpose ?? ''}\n` +
        '\n' +
        'File Format:\n' +
        '------------\n' +
        `${ctx.summaryFileFormat ?? ''}\n` +
        '5. Multiple file entries, each consisting of:\n' +
        '  a. A separator line (================)\n' +
        '  b. The file path (File: path/to/file)\n' +
        '  c. Another separator line\n' +
        '  d. The full contents of the file\n' +
        '  e. A blank line\n' +
        '\n' +
        'Usage Guidelines:\n' +
        '-----------------\n' +
        `${ctx.summaryUsageGuidelines ?? ''}\n` +
        '\n' +
        'Notes:\n' +
        '------\n' +
        `${ctx.summaryNotes ?? ''}\n` +
        '\n',
    );
  }

  // Static blank line between fileSummary and headerText blocks.
  parts.push('\n');

  if (ctx.headerText) {
    parts.push(
      `${PLAIN_LONG_SEPARATOR}\n` +
        'User Provided Header\n' +
        `${PLAIN_LONG_SEPARATOR}\n` +
        `${ctx.headerText}\n` +
        '\n',
    );
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(
      `${PLAIN_LONG_SEPARATOR}\n` +
        'Directory Structure\n' +
        `${PLAIN_LONG_SEPARATOR}\n` +
        `${ctx.treeString ?? ''}\n` +
        '\n',
    );
  }

  if (ctx.filesEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\n` + 'Files\n' + `${PLAIN_LONG_SEPARATOR}\n` + '\n');
    for (const file of ctx.processedFiles ?? []) {
      parts.push(`${PLAIN_SEPARATOR}\n` + `File: ${file.path}\n` + `${PLAIN_SEPARATOR}\n` + `${file.content}\n` + '\n');
    }
  }

  // Static blank line between files and gitDiff blocks.
  parts.push('\n');

  if (ctx.gitDiffEnabled) {
    parts.push(
      `${PLAIN_LONG_SEPARATOR}\n` +
        'Git Diffs\n' +
        `${PLAIN_LONG_SEPARATOR}\n` +
        `${PLAIN_SEPARATOR}\n` +
        `${ctx.gitDiffWorkTree ?? ''}\n` +
        `${PLAIN_SEPARATOR}\n` +
        '\n' +
        `${PLAIN_SEPARATOR}\n` +
        'Git Diffs Staged\n' +
        `${PLAIN_SEPARATOR}\n` +
        `${ctx.gitDiffStaged ?? ''}\n` +
        '\n',
    );
  }

  // Static blank line between gitDiff and gitLog blocks.
  parts.push('\n');

  if (ctx.gitLogEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\n` + 'Git Logs\n' + `${PLAIN_LONG_SEPARATOR}\n`);
    for (const commit of ctx.gitLogCommits ?? []) {
      parts.push(`${PLAIN_SEPARATOR}\n` + `Date: ${commit.date}\n` + `Message: ${commit.message}\n` + 'Files:\n');
      for (const file of commit.files) {
        parts.push(`  - ${file}\n`);
      }
      parts.push(`${PLAIN_SEPARATOR}\n` + '\n');
    }
    // Trailing blank line inside the gitLog {{#if}} block (before {{/if}}).
    parts.push('\n');
  }

  // Static blank line between gitLog and instruction blocks.
  parts.push('\n');

  if (ctx.instruction) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\n` + 'Instruction\n' + `${PLAIN_LONG_SEPARATOR}\n` + `${ctx.instruction}\n`);
  }

  // Static blank line between instruction and "End of Codebase" footer.
  parts.push('\n');

  parts.push(`${PLAIN_LONG_SEPARATOR}\n` + 'End of Codebase\n' + `${PLAIN_LONG_SEPARATOR}\n`);

  return parts.join('');
};
