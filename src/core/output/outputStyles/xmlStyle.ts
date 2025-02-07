export const getXmlTemplate = () => {
  return /* xml */ `
{{{generationHeader}}}

{{#if fileSummaryEnabled}}
<file_summary>
This section contains a summary of this file.

<purpose>
{{{summaryPurpose}}}
</purpose>

<file_format>
{{{summaryFileFormat}}}
4. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
{{{summaryUsageGuidelines}}}
</usage_guidelines>

<notes>
{{{summaryNotes}}}
</notes>

<additional_info>
{{#if headerText}}
<user_provided_header>
{{{headerText}}}
</user_provided_header>
{{/if}}

</additional_info>

</file_summary>

{{/if}}
{{#if directoryStructureEnabled}}
<directory_structure>
{{{treeString}}}
</directory_structure>

{{/if}}
<files>
This section contains the contents of the repository's files.

{{#each processedFiles}}
<file path="{{{this.path}}}">
{{{this.content}}}
</file>

{{/each}}
</files>

{{#if instruction}}
<instruction>
{{{instruction}}}
</instruction>
{{/if}}
`;
};

export const getGitMetricsXmlTemplate = () => {
  return /* xml */ `{{#if gitMetrics}}
<git_metrics>
  <summary>
    Total Commits Analyzed: {{gitMetrics.totalCommits}}
  </summary>
  <content>
    {{#each gitMetrics.mostChangedFiles}}
    {{addOne @index}}. {{this.path}} ({{this.changes}} changes)
    {{/each}}
  </content>
</git_metrics>
{{/if}}`;
};
