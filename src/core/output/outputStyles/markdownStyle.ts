import type { RenderContext } from '../outputGeneratorTypes.js';
import { getLanguageFromFilePath } from '../outputStyleUtils.js';

export const renderMarkdown = (ctx: Partial<RenderContext>): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      ctx.generationHeader ?? '',
      '\n\n# File Summary\n\n## Purpose\n',
      ctx.summaryPurpose ?? '',
      '\n\n## File Format\n',
      ctx.summaryFileFormat ?? '',
      `\n5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
`,
      ctx.summaryUsageGuidelines ?? '',
      '\n\n## Notes\n',
      ctx.summaryNotes ?? '',
      '\n',
    );
  }

  if (ctx.headerText) {
    parts.push('\n# User Provided Header\n', ctx.headerText, '\n');
  }

  if (ctx.directoryStructureEnabled) {
    parts.push('\n# Directory Structure\n```\n', ctx.treeString ?? '', '\n```\n');
  }

  if (ctx.filesEnabled) {
    parts.push('\n# Files\n');
    const delimiter = ctx.markdownCodeBlockDelimiter ?? '```';
    for (const file of ctx.processedFiles ?? []) {
      parts.push(
        '\n## File: ',
        file.path,
        '\n',
        delimiter,
        getLanguageFromFilePath(file.path),
        '\n',
        file.content,
        '\n',
        delimiter,
        '\n',
      );
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push(
      '\n# Git Diffs\n## Git Diffs Working Tree\n```diff\n',
      ctx.gitDiffWorkTree ?? '',
      '\n```\n\n## Git Diffs Staged\n```diff\n',
      ctx.gitDiffStaged ?? '',
      '\n```\n',
    );
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push('\n# Git Logs\n');
    for (const commit of ctx.gitLogCommits) {
      parts.push('\n## Commit: ', commit.date, '\n**Message:** ', commit.message, '\n\n**Files:**\n');
      for (const file of commit.files) {
        parts.push('- ', file, '\n');
      }
    }
  }

  if (ctx.instruction) {
    parts.push('\n# Instruction\n', ctx.instruction);
  }

  return parts.join('');
};
