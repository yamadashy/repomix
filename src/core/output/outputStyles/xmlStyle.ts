import type { RenderContext } from '../outputGeneratorTypes.js';

export const renderXml = (ctx: Partial<RenderContext>): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      ctx.generationHeader ?? '',
      '\n\n<file_summary>\nThis section contains a summary of this file.\n\n<purpose>\n',
      ctx.summaryPurpose ?? '',
      '\n</purpose>\n\n<file_format>\n',
      ctx.summaryFileFormat ?? '',
      `\n5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
`,
      ctx.summaryUsageGuidelines ?? '',
      '\n</usage_guidelines>\n\n<notes>\n',
      ctx.summaryNotes ?? '',
      '\n</notes>\n\n</file_summary>\n',
    );
  }

  if (ctx.headerText) {
    parts.push('\n<user_provided_header>\n', ctx.headerText, '\n</user_provided_header>\n');
  }

  if (ctx.directoryStructureEnabled) {
    parts.push('\n<directory_structure>\n', ctx.treeString ?? '', '\n</directory_structure>\n');
  }

  if (ctx.filesEnabled) {
    parts.push("\n<files>\nThis section contains the contents of the repository's files.\n");
    for (const file of ctx.processedFiles ?? []) {
      parts.push('\n<file path="', file.path, '">\n', file.content, '\n</file>\n');
    }
    parts.push('\n</files>');
  }

  if (ctx.gitDiffEnabled) {
    parts.push(
      '\n\n<git_diffs>\n<git_diff_work_tree>\n',
      ctx.gitDiffWorkTree ?? '',
      '\n</git_diff_work_tree>\n<git_diff_staged>\n',
      ctx.gitDiffStaged ?? '',
      '\n</git_diff_staged>\n</git_diffs>',
    );
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push('\n\n<git_logs>\n');
    for (const commit of ctx.gitLogCommits) {
      parts.push(
        '<git_log_commit>\n<date>',
        commit.date,
        '</date>\n<message>',
        commit.message,
        '</message>\n<files>\n',
      );
      for (const file of commit.files) {
        parts.push(file, '\n');
      }
      parts.push('</files>\n</git_log_commit>\n');
    }
    parts.push('</git_logs>');
  }

  if (ctx.instruction) {
    parts.push('\n\n<instruction>\n', ctx.instruction, '\n</instruction>');
  }

  return parts.join('');
};
