const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

export const getPlainTemplate = () => {
  return `
{{{generationHeader}}}

{{#if fileSummaryEnabled}}
${PLAIN_LONG_SEPARATOR}
File Summary
${PLAIN_LONG_SEPARATOR}

Purpose:
--------
{{{summaryPurpose}}}

File Format:
------------
{{{summaryFileFormat}}}
4. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
{{{summaryUsageGuidelines}}}

Notes:
------
{{{summaryNotes}}}

Additional Info:
----------------
{{#if headerText}}
User Provided Header:
-----------------------
{{{headerText}}}
{{/if}}

{{/if}}
{{#if directoryStructureEnabled}}
${PLAIN_LONG_SEPARATOR}
Directory Structure
${PLAIN_LONG_SEPARATOR}
{{{treeString}}}

{{/if}}
${PLAIN_LONG_SEPARATOR}
Files
${PLAIN_LONG_SEPARATOR}

{{#each processedFiles}}
${PLAIN_SEPARATOR}
File: {{{this.path}}}
${PLAIN_SEPARATOR}
{{{this.content}}}

{{/each}}

{{#if instruction}}
${PLAIN_LONG_SEPARATOR}
Instruction
${PLAIN_LONG_SEPARATOR}
{{{instruction}}}
{{/if}}

${PLAIN_LONG_SEPARATOR}
End of Codebase
${PLAIN_LONG_SEPARATOR}
`;
};

export const getGitMetricsPlainTemplate = () => {
  return `{{#if gitMetrics}}
================
Git Metrics
================

Summary:
--------
Total Commits Analyzed: {{gitMetrics.totalCommits}}

Most Changed Files:
------------------
{{#each gitMetrics.mostChangedFiles}}
{{addOne @index}}. {{this.path}} ({{this.changes}} changes)
{{/each}}
{{/if}}`;
};
