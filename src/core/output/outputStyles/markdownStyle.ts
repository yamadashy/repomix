import type { RenderContext } from '../outputGeneratorTypes.js';
import { getLanguageFromFilePath } from '../outputStyleUtils.js';

export const renderMarkdown = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}

# File Summary

## Purpose
${ctx.summaryPurpose}

## File Format
${ctx.summaryFileFormat}
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
${ctx.summaryUsageGuidelines}

## Notes
${ctx.summaryNotes}

`,
    );
  }

  if (ctx.headerText) {
    parts.push(`# User Provided Header
${ctx.headerText}

`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`# Directory Structure
\`\`\`
${ctx.treeString}
\`\`\`

`);
  }

  if (ctx.filesEnabled) {
    parts.push('# Files\n\n');
    // Push individual fragments instead of template literals to avoid creating
    // intermediate strings containing the full file content per file.
    for (const file of ctx.processedFiles) {
      const lang = getLanguageFromFilePath(file.path);
      parts.push(
        '## File: ',
        file.path,
        '\n',
        ctx.markdownCodeBlockDelimiter,
        lang,
        '\n',
        file.content,
        '\n',
        ctx.markdownCodeBlockDelimiter,
        '\n\n',
      );
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push(`# Git Diffs
## Git Diffs Working Tree
\`\`\`diff
${ctx.gitDiffWorkTree ?? ''}
\`\`\`

## Git Diffs Staged
\`\`\`diff
${ctx.gitDiffStaged ?? ''}
\`\`\`

`);
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push('# Git Logs\n\n');
    for (const commit of ctx.gitLogCommits) {
      parts.push(`## Commit: ${commit.date}
**Message:** ${commit.message}

**Files:**
`);
      for (const file of commit.files) {
        parts.push(`- ${file}\n`);
      }
      parts.push('\n');
    }
  }

  if (ctx.instruction) {
    parts.push(`# Instruction
${ctx.instruction}`);
  }

  return parts.join('');
};
