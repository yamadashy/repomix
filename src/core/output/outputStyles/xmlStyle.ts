import type { RenderContext } from '../outputGeneratorTypes.js';

export const renderXml = (ctx: RenderContext): string => {
  const parts: string[] = [];

  if (ctx.fileSummaryEnabled) {
    parts.push(
      `${ctx.generationHeader}

<file_summary>
This section contains a summary of this file.

<purpose>
${ctx.summaryPurpose}
</purpose>

<file_format>
${ctx.summaryFileFormat}
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
${ctx.summaryUsageGuidelines}
</usage_guidelines>

<notes>
${ctx.summaryNotes}
</notes>

</file_summary>

`,
    );
  }

  if (ctx.headerText) {
    parts.push(`<user_provided_header>
${ctx.headerText}
</user_provided_header>

`);
  }

  if (ctx.directoryStructureEnabled) {
    parts.push(`<directory_structure>
${ctx.treeString}
</directory_structure>

`);
  }

  if (ctx.filesEnabled) {
    parts.push(`<files>
This section contains the contents of the repository's files.

`);
    for (const file of ctx.processedFiles) {
      parts.push(`<file path="${file.path}">
${file.content}
</file>

`);
    }
    parts.push('</files>');
  }

  if (ctx.gitDiffEnabled) {
    parts.push(`
<git_diffs>
<git_diff_work_tree>
${ctx.gitDiffWorkTree ?? ''}
</git_diff_work_tree>
<git_diff_staged>
${ctx.gitDiffStaged ?? ''}
</git_diff_staged>
</git_diffs>`);
  }

  if (ctx.gitLogEnabled && ctx.gitLogCommits) {
    parts.push(`
<git_logs>
`);
    for (const commit of ctx.gitLogCommits) {
      parts.push(`<git_log_commit>
<date>${commit.date}</date>
<message>${commit.message}</message>
<files>
`);
      for (const file of commit.files) {
        parts.push(`${file}
`);
      }
      parts.push(`</files>
</git_log_commit>
`);
    }
    parts.push('</git_logs>');
  }

  if (ctx.instruction) {
    parts.push(`
<instruction>
${ctx.instruction}
</instruction>`);
  }

  return parts.join('');
};

// Keep backward-compatible export for any code referencing the template
export const getXmlTemplate = (): string => {
  // Return empty string - templates are no longer used
  throw new Error('Handlebars templates are no longer used. Use renderXml() instead.');
};
