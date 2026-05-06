import type { RenderContext } from '../outputGeneratorTypes.js';

export const renderXml = (ctx: Partial<RenderContext>): string => {
  const parts: string[] = [];

  // Leading newline (from template literal opening).
  parts.push('\n');

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader ?? ''}\n` +
        '\n' +
        '<file_summary>\n' +
        'This section contains a summary of this file.\n' +
        '\n' +
        '<purpose>\n' +
        `${ctx.summaryPurpose ?? ''}\n` +
        '</purpose>\n' +
        '\n' +
        '<file_format>\n' +
        `${ctx.summaryFileFormat ?? ''}\n` +
        '5. Multiple file entries, each consisting of:\n' +
        '  - File path as an attribute\n' +
        '  - Full contents of the file\n' +
        '</file_format>\n' +
        '\n' +
        '<usage_guidelines>\n' +
        `${ctx.summaryUsageGuidelines ?? ''}\n` +
        '</usage_guidelines>\n' +
        '\n' +
        '<notes>\n' +
        `${ctx.summaryNotes ?? ''}\n` +
        '</notes>\n' +
        '\n' +
        '</file_summary>\n' +
        '\n',
    );
  }

  if (ctx.headerText) {
    parts.push(`<user_provided_header>\n${ctx.headerText}\n</user_provided_header>\n\n`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`<directory_structure>\n${ctx.treeString ?? ''}\n</directory_structure>\n\n`);
  }

  if (ctx.filesEnabled) {
    parts.push("<files>\nThis section contains the contents of the repository's files.\n\n");
    for (const file of ctx.processedFiles ?? []) {
      parts.push(`<file path="${file.path}">\n${file.content}\n</file>\n\n`);
    }
    parts.push('</files>\n');
  }

  // Static blank line between files and gitDiff blocks.
  parts.push('\n');

  if (ctx.gitDiffEnabled) {
    parts.push(
      '<git_diffs>\n' +
        '<git_diff_work_tree>\n' +
        `${ctx.gitDiffWorkTree ?? ''}\n` +
        '</git_diff_work_tree>\n' +
        '<git_diff_staged>\n' +
        `${ctx.gitDiffStaged ?? ''}\n` +
        '</git_diff_staged>\n' +
        '</git_diffs>\n',
    );
  }

  // Static blank line between gitDiff and gitLog blocks.
  parts.push('\n');

  if (ctx.gitLogEnabled) {
    parts.push('<git_logs>\n');
    for (const commit of ctx.gitLogCommits ?? []) {
      parts.push(
        '<git_log_commit>\n' + `<date>${commit.date}</date>\n` + `<message>${commit.message}</message>\n` + '<files>\n',
      );
      for (const file of commit.files) {
        parts.push(`${file}\n`);
      }
      parts.push('</files>\n</git_log_commit>\n');
    }
    parts.push('</git_logs>\n');
  }

  // Static blank line between gitLog and instruction blocks.
  parts.push('\n');

  if (ctx.instruction) {
    parts.push(`<instruction>\n${ctx.instruction}\n</instruction>\n`);
  }

  return parts.join('');
};
