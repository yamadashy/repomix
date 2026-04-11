import type { RenderContext } from './outputGeneratorTypes.js';
import { getLanguageFromFilePath } from './outputStyleUtils.js';

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

const buildGitDiffsXml = (ctx: RenderContext, parts: string[]): void => {
  parts.push('<git_diffs>\n<git_diff_work_tree>\n');
  if (ctx.gitDiffWorkTree) parts.push(ctx.gitDiffWorkTree);
  parts.push('\n</git_diff_work_tree>\n<git_diff_staged>\n');
  if (ctx.gitDiffStaged) parts.push(ctx.gitDiffStaged);
  parts.push('\n</git_diff_staged>\n</git_diffs>\n');
};

const buildGitLogsXml = (ctx: RenderContext, parts: string[]): void => {
  parts.push('<git_logs>\n');
  if (ctx.gitLogCommits) {
    for (const commit of ctx.gitLogCommits) {
      parts.push('<git_log_commit>\n<date>');
      parts.push(commit.date);
      parts.push('</date>\n<message>');
      parts.push(commit.message);
      parts.push('</message>\n<files>\n');
      for (const f of commit.files) {
        parts.push(f, '\n');
      }
      parts.push('</files>\n</git_log_commit>\n');
    }
  }
  parts.push('</git_logs>\n');
};

export const buildXmlOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      ctx.generationHeader,
      '\n\n<file_summary>\nThis section contains a summary of this file.\n\n<purpose>\n',
      ctx.summaryPurpose,
      '\n</purpose>\n\n<file_format>\n',
      ctx.summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  - File path as an attribute\n  - Full contents of the file\n</file_format>\n\n<usage_guidelines>\n',
      ctx.summaryUsageGuidelines,
      '\n</usage_guidelines>\n\n<notes>\n',
      ctx.summaryNotes,
      '\n</notes>\n\n</file_summary>\n\n',
    );
  }

  if (ctx.headerText) {
    parts.push('<user_provided_header>\n', ctx.headerText, '\n</user_provided_header>\n\n');
  }

  if (ctx.directoryStructureEnabled) {
    parts.push('<directory_structure>\n', ctx.treeString, '\n</directory_structure>\n\n');
  }

  if (ctx.filesEnabled) {
    parts.push("<files>\nThis section contains the contents of the repository's files.\n\n");
    for (const file of ctx.processedFiles) {
      parts.push('<file path="', file.path, '">\n', file.content, '\n</file>\n\n');
    }
    parts.push('</files>\n');
  }

  if (ctx.gitDiffEnabled) {
    parts.push('\n');
    buildGitDiffsXml(ctx, parts);
  }

  if (ctx.gitLogEnabled) {
    parts.push('\n');
    buildGitLogsXml(ctx, parts);
  }

  if (ctx.instruction) {
    parts.push('\n<instruction>\n', ctx.instruction, '\n</instruction>\n');
  }

  return parts.join('');
};

export const buildMarkdownOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      ctx.generationHeader,
      '\n\n# File Summary\n\n## Purpose\n',
      ctx.summaryPurpose,
      '\n\n## File Format\n',
      ctx.summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  a. A header with the file path (## File: path/to/file)\n  b. The full contents of the file in a code block\n\n## Usage Guidelines\n',
      ctx.summaryUsageGuidelines,
      '\n\n## Notes\n',
      ctx.summaryNotes,
      '\n\n',
    );
  }

  if (ctx.headerText) {
    parts.push('# User Provided Header\n', ctx.headerText, '\n\n');
  }

  if (ctx.directoryStructureEnabled) {
    parts.push('# Directory Structure\n```\n', ctx.treeString, '\n```\n\n');
  }

  if (ctx.filesEnabled) {
    parts.push('# Files\n\n');
    const delimiter = ctx.markdownCodeBlockDelimiter;
    for (const file of ctx.processedFiles) {
      parts.push(
        '## File: ',
        file.path,
        '\n',
        delimiter,
        getLanguageFromFilePath(file.path),
        '\n',
        file.content,
        '\n',
        delimiter,
        '\n\n',
      );
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push('\n# Git Diffs\n## Git Diffs Working Tree\n```diff\n');
    if (ctx.gitDiffWorkTree) parts.push(ctx.gitDiffWorkTree);
    parts.push('\n```\n\n## Git Diffs Staged\n```diff\n');
    if (ctx.gitDiffStaged) parts.push(ctx.gitDiffStaged);
    parts.push('\n```\n\n');
  }

  if (ctx.gitLogEnabled) {
    parts.push('\n# Git Logs\n\n');
    if (ctx.gitLogCommits) {
      for (const commit of ctx.gitLogCommits) {
        parts.push('## Commit: ', commit.date, '\n**Message:** ', commit.message, '\n\n**Files:**\n');
        for (const f of commit.files) {
          parts.push('- ', f, '\n');
        }
        parts.push('\n');
      }
    }
  }

  if (ctx.instruction) {
    parts.push('\n# Instruction\n', ctx.instruction, '\n');
  }

  return parts.join('');
};

export const buildPlainOutput = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      ctx.generationHeader,
      '\n\n',
      PLAIN_LONG_SEPARATOR,
      '\nFile Summary\n',
      PLAIN_LONG_SEPARATOR,
      '\n\nPurpose:\n--------\n',
      ctx.summaryPurpose,
      '\n\nFile Format:\n------------\n',
      ctx.summaryFileFormat,
      '\n5. Multiple file entries, each consisting of:\n  a. A separator line (================)\n  b. The file path (File: path/to/file)\n  c. Another separator line\n  d. The full contents of the file\n  e. A blank line\n\nUsage Guidelines:\n-----------------\n',
      ctx.summaryUsageGuidelines,
      '\n\nNotes:\n------\n',
      ctx.summaryNotes,
      '\n\n',
    );
  }

  if (ctx.headerText) {
    parts.push(
      '\n',
      PLAIN_LONG_SEPARATOR,
      '\nUser Provided Header\n',
      PLAIN_LONG_SEPARATOR,
      '\n',
      ctx.headerText,
      '\n\n',
    );
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(PLAIN_LONG_SEPARATOR, '\nDirectory Structure\n', PLAIN_LONG_SEPARATOR, '\n', ctx.treeString, '\n\n');
  }

  if (ctx.filesEnabled) {
    parts.push(PLAIN_LONG_SEPARATOR, '\nFiles\n', PLAIN_LONG_SEPARATOR, '\n\n');
    for (const file of ctx.processedFiles) {
      parts.push(PLAIN_SEPARATOR, '\nFile: ', file.path, '\n', PLAIN_SEPARATOR, '\n', file.content, '\n\n');
    }
  }

  if (ctx.gitDiffEnabled) {
    parts.push('\n', PLAIN_LONG_SEPARATOR, '\nGit Diffs\n', PLAIN_LONG_SEPARATOR, '\n', PLAIN_SEPARATOR, '\n');
    if (ctx.gitDiffWorkTree) parts.push(ctx.gitDiffWorkTree);
    parts.push('\n', PLAIN_SEPARATOR, '\n\n', PLAIN_SEPARATOR, '\nGit Diffs Staged\n', PLAIN_SEPARATOR, '\n');
    if (ctx.gitDiffStaged) parts.push(ctx.gitDiffStaged);
    parts.push('\n\n');
  }

  if (ctx.gitLogEnabled) {
    parts.push('\n', PLAIN_LONG_SEPARATOR, '\nGit Logs\n', PLAIN_LONG_SEPARATOR, '\n');
    if (ctx.gitLogCommits) {
      for (const commit of ctx.gitLogCommits) {
        parts.push(PLAIN_SEPARATOR, '\nDate: ', commit.date, '\nMessage: ', commit.message, '\nFiles:\n');
        for (const f of commit.files) {
          parts.push('  - ', f, '\n');
        }
        parts.push(PLAIN_SEPARATOR, '\n\n');
      }
    }
    parts.push('\n');
  }

  if (ctx.instruction) {
    parts.push('\n', PLAIN_LONG_SEPARATOR, '\nInstruction\n', PLAIN_LONG_SEPARATOR, '\n', ctx.instruction, '\n');
  }

  parts.push('\n', PLAIN_LONG_SEPARATOR, '\nEnd of Codebase\n', PLAIN_LONG_SEPARATOR, '\n');

  return parts.join('');
};
