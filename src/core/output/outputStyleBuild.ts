import type { RepomixOutputStyle } from '../../config/configDefaults.js';
import { RepomixError } from '../../shared/errorHandle.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { getLanguageFromFilePath } from './outputFileLanguage.js';
import type { RenderContext } from './outputGeneratorTypes.js';

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

const buildXmlOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];
  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}\n\n<file_summary>\nThis section contains a summary of this file.\n\n<purpose>\n${ctx.summaryPurpose}\n</purpose>\n\n<file_format>\n${ctx.summaryFileFormat}\n5. Multiple file entries, each consisting of:\n  - File path as an attribute\n  - Full contents of the file\n</file_format>\n\n<usage_guidelines>\n${ctx.summaryUsageGuidelines}\n</usage_guidelines>\n\n<notes>\n${ctx.summaryNotes}\n</notes>\n\n</file_summary>\n\n`,
    );
  }
  if (ctx.headerText) {
    parts.push(`<user_provided_header>\n${ctx.headerText}\n</user_provided_header>\n\n`);
  }
  if (ctx.directoryStructureEnabled) {
    parts.push(`<directory_structure>\n${ctx.treeString}\n</directory_structure>\n\n`);
  }
  if (ctx.filesEnabled) {
    parts.push(`<files>\nThis section contains the contents of the repository's files.\n\n`);
    for (const file of ctx.processedFiles) {
      parts.push(`<file path="${file.path}">\n${file.content}\n</file>\n\n`);
    }
    parts.push('</files>\n');
  }
  if (ctx.gitDiffEnabled) {
    parts.push(
      `\n<git_diffs>\n<git_diff_work_tree>\n${ctx.gitDiffWorkTree ?? ''}\n</git_diff_work_tree>\n<git_diff_staged>\n${ctx.gitDiffStaged ?? ''}\n</git_diff_staged>\n</git_diffs>\n`,
    );
  }
  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push('\n<git_logs>\n');
    for (const commit of ctx.gitLogCommits) {
      parts.push(`<git_log_commit>\n<date>${commit.date}</date>\n<message>${commit.message}</message>\n<files>\n`);
      for (const file of commit.files) {
        parts.push(`${file}\n`);
      }
      parts.push('</files>\n</git_log_commit>\n');
    }
    parts.push('</git_logs>\n');
  }
  if (ctx.instruction) {
    parts.push(`\n<instruction>\n${ctx.instruction}\n</instruction>\n`);
  }
  return `${parts.join('').trim()}\n`;
};

const buildMarkdownOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];
  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}\n\n# File Summary\n\n## Purpose\n${ctx.summaryPurpose}\n\n## File Format\n${ctx.summaryFileFormat}\n5. Multiple file entries, each consisting of:\n  a. A header with the file path (## File: path/to/file)\n  b. The full contents of the file in a code block\n\n## Usage Guidelines\n${ctx.summaryUsageGuidelines}\n\n## Notes\n${ctx.summaryNotes}\n\n`,
    );
  }
  if (ctx.headerText) {
    parts.push(`# User Provided Header\n${ctx.headerText}\n\n`);
  }
  if (ctx.directoryStructureEnabled) {
    parts.push(`# Directory Structure\n\`\`\`\n${ctx.treeString}\n\`\`\`\n\n`);
  }
  if (ctx.filesEnabled) {
    const delim = ctx.markdownCodeBlockDelimiter;
    parts.push('# Files\n\n');
    for (const file of ctx.processedFiles) {
      parts.push(`## File: ${file.path}\n${delim}${getLanguageFromFilePath(file.path)}\n${file.content}\n${delim}\n\n`);
    }
  }
  if (ctx.gitDiffEnabled) {
    parts.push(
      `\n# Git Diffs\n## Git Diffs Working Tree\n\`\`\`diff\n${ctx.gitDiffWorkTree ?? ''}\n\`\`\`\n\n## Git Diffs Staged\n\`\`\`diff\n${ctx.gitDiffStaged ?? ''}\n\`\`\`\n\n`,
    );
  }
  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push('\n# Git Logs\n\n');
    for (const commit of ctx.gitLogCommits) {
      parts.push(`## Commit: ${commit.date}\n**Message:** ${commit.message}\n\n**Files:**\n`);
      for (const file of commit.files) {
        parts.push(`- ${file}\n`);
      }
      parts.push('\n');
    }
  }
  if (ctx.instruction) {
    parts.push(`\n# Instruction\n${ctx.instruction}\n`);
  }
  return `${parts.join('').trim()}\n`;
};

const buildPlainOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];
  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}\n\n${PLAIN_LONG_SEPARATOR}\nFile Summary\n${PLAIN_LONG_SEPARATOR}\n\nPurpose:\n--------\n${ctx.summaryPurpose}\n\nFile Format:\n------------\n${ctx.summaryFileFormat}\n5. Multiple file entries, each consisting of:\n  a. A separator line (================)\n  b. The file path (File: path/to/file)\n  c. Another separator line\n  d. The full contents of the file\n  e. A blank line\n\nUsage Guidelines:\n-----------------\n${ctx.summaryUsageGuidelines}\n\nNotes:\n------\n${ctx.summaryNotes}\n\n`,
    );
  }
  if (ctx.headerText) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nUser Provided Header\n${PLAIN_LONG_SEPARATOR}\n${ctx.headerText}\n\n`);
  }
  if (ctx.directoryStructureEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\nDirectory Structure\n${PLAIN_LONG_SEPARATOR}\n${ctx.treeString}\n\n`);
  }
  if (ctx.filesEnabled) {
    parts.push(`${PLAIN_LONG_SEPARATOR}\nFiles\n${PLAIN_LONG_SEPARATOR}\n\n`);
    for (const file of ctx.processedFiles) {
      parts.push(`${PLAIN_SEPARATOR}\nFile: ${file.path}\n${PLAIN_SEPARATOR}\n${file.content}\n\n`);
    }
  }
  if (ctx.gitDiffEnabled) {
    parts.push(
      `\n${PLAIN_LONG_SEPARATOR}\nGit Diffs\n${PLAIN_LONG_SEPARATOR}\n${PLAIN_SEPARATOR}\n${ctx.gitDiffWorkTree ?? ''}\n${PLAIN_SEPARATOR}\n\n${PLAIN_SEPARATOR}\nGit Diffs Staged\n${PLAIN_SEPARATOR}\n${ctx.gitDiffStaged ?? ''}\n\n`,
    );
  }
  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nGit Logs\n${PLAIN_LONG_SEPARATOR}\n`);
    for (const commit of ctx.gitLogCommits) {
      parts.push(`${PLAIN_SEPARATOR}\nDate: ${commit.date}\nMessage: ${commit.message}\nFiles:\n`);
      for (const file of commit.files) {
        parts.push(`  - ${file}\n`);
      }
      parts.push(`${PLAIN_SEPARATOR}\n\n`);
    }
    parts.push('\n');
  }
  if (ctx.instruction) {
    parts.push(`\n${PLAIN_LONG_SEPARATOR}\nInstruction\n${PLAIN_LONG_SEPARATOR}\n${ctx.instruction}\n`);
  }
  parts.push(`\n${PLAIN_LONG_SEPARATOR}\nEnd of Codebase\n${PLAIN_LONG_SEPARATOR}\n`);
  return `${parts.join('').trim()}\n`;
};

export const buildDirectOutput = (
  style: RepomixOutputStyle,
  renderContext: RenderContext,
  processedFiles?: ReadonlyArray<ProcessedFile>,
): string => {
  try {
    switch (style) {
      case 'xml':
        return buildXmlOutput(renderContext);
      case 'markdown':
        return buildMarkdownOutput(renderContext);
      case 'plain':
        return buildPlainOutput(renderContext);
      default:
        throw new RepomixError(`Unsupported output style: ${style}`);
    }
  } catch (error) {
    if (error instanceof RangeError && error.message === 'Invalid string length') {
      let largeFilesInfo = '';
      const files = processedFiles ?? renderContext.processedFiles;
      if (files.length > 0) {
        const topFiles = [...files]
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, 5)
          .map((f) => `  - ${f.path} (${(f.content.length / 1024 / 1024).toFixed(1)} MB)`)
          .join('\n');
        largeFilesInfo = `\n\nLargest files in this repository:\n${topFiles}`;
      }

      throw new RepomixError(
        `Output size exceeds JavaScript string limit. The repository contains files that are too large to process.
Please try:
  - Use --ignore to exclude large files (e.g., --ignore "docs/**" or --ignore "*.html")
  - Use --include to process only specific files
  - Process smaller portions of the repository at a time${largeFilesInfo}`,
        { cause: error },
      );
    }
    throw error;
  }
};
