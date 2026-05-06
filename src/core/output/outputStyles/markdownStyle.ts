import type { RenderContext } from '../outputGeneratorTypes.js';
import { getLanguageFromFilePath } from '../outputStyleUtils.js';

export const renderMarkdown = (ctx: Partial<RenderContext>): string => {
  const parts: string[] = [];

  // Leading newline (from template literal opening).
  parts.push('\n');

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader ?? ''}\n` +
        '\n' +
        '# File Summary\n' +
        '\n' +
        '## Purpose\n' +
        `${ctx.summaryPurpose ?? ''}\n` +
        '\n' +
        '## File Format\n' +
        `${ctx.summaryFileFormat ?? ''}\n` +
        '5. Multiple file entries, each consisting of:\n' +
        '  a. A header with the file path (## File: path/to/file)\n' +
        '  b. The full contents of the file in a code block\n' +
        '\n' +
        '## Usage Guidelines\n' +
        `${ctx.summaryUsageGuidelines ?? ''}\n` +
        '\n' +
        '## Notes\n' +
        `${ctx.summaryNotes ?? ''}\n` +
        '\n',
    );
  }

  if (ctx.headerText) {
    parts.push(`# User Provided Header\n${ctx.headerText}\n\n`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push('# Directory Structure\n' + '```\n' + `${ctx.treeString ?? ''}\n` + '```\n' + '\n');
  }

  if (ctx.filesEnabled) {
    parts.push('# Files\n\n');
    const delimiter = ctx.markdownCodeBlockDelimiter ?? '```';
    for (const file of ctx.processedFiles ?? []) {
      const language = getLanguageFromFilePath(file.path);
      parts.push(
        `## File: ${file.path}\n` + `${delimiter}${language}\n` + `${file.content}\n` + `${delimiter}\n` + '\n',
      );
    }
  }

  // Static blank line between files and gitDiff blocks.
  parts.push('\n');

  if (ctx.gitDiffEnabled) {
    parts.push(
      '# Git Diffs\n' +
        '## Git Diffs Working Tree\n' +
        '```diff\n' +
        `${ctx.gitDiffWorkTree ?? ''}\n` +
        '```\n' +
        '\n' +
        '## Git Diffs Staged\n' +
        '```diff\n' +
        `${ctx.gitDiffStaged ?? ''}\n` +
        '```\n' +
        '\n',
    );
  }

  // Static blank line between gitDiff and gitLog blocks.
  parts.push('\n');

  if (ctx.gitLogEnabled) {
    parts.push('# Git Logs\n\n');
    for (const commit of ctx.gitLogCommits ?? []) {
      parts.push(`## Commit: ${commit.date}\n` + `**Message:** ${commit.message}\n` + '\n' + '**Files:**\n');
      for (const file of commit.files) {
        parts.push(`- ${file}\n`);
      }
      parts.push('\n');
    }
  }

  // Static blank line between gitLog and instruction blocks.
  parts.push('\n');

  if (ctx.instruction) {
    parts.push(`# Instruction\n${ctx.instruction}\n`);
  }

  return parts.join('');
};
