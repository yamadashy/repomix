export const getXmlTemplate = () => {
  return /* xml */ `
{{#if fileSummaryEnabled}}
{{{generationHeader}}}

<file_summary>
This section contains a summary of this file.

<purpose>
{{{summaryPurpose}}}
</purpose>

<file_format>
{{{summaryFileFormat}}}
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
{{{summaryUsageGuidelines}}}
</usage_guidelines>

<notes>
{{{summaryNotes}}}
</notes>

</file_summary>

{{/if}}
{{#if headerText}}
<user_provided_header>
{{{headerText}}}
</user_provided_header>

{{/if}}
{{#if directoryStructureEnabled}}
<directory_structure>
{{{treeString}}}
</directory_structure>

{{/if}}
{{#if filesEnabled}}
<files>
This section contains the contents of the repository's files.

{{#each processedFiles}}
<file path="{{{this.path}}}">
{{{this.content}}}
</file>

{{/each}}
</files>
{{/if}}

{{#if gitDiffEnabled}}
<git_diffs>
<git_diff_work_tree>
{{{gitDiffWorkTree}}}
</git_diff_work_tree>
<git_diff_staged>
{{{gitDiffStaged}}}
</git_diff_staged>
</git_diffs>
{{/if}}

{{#if gitLogEnabled}}
<git_logs>
{{#if gitCommitHistorySummary}}
<summary>
<total_commits>{{{gitCommitHistorySummary.totalCommits}}}</total_commits>
<merge_commits>{{{gitCommitHistorySummary.mergeCommits}}}</merge_commits>
<range>{{{gitCommitHistorySummary.range}}}</range>
<detail_level>{{{gitCommitHistorySummary.detailLevel}}}</detail_level>
</summary>
{{/if}}

{{#if gitCommitGraph}}
<commit_graph>
<ascii_graph>
{{{gitCommitGraph.graph}}}
</ascii_graph>
{{#if gitCommitGraph.mermaidGraph}}
<mermaid_graph>
{{{gitCommitGraph.mermaidGraph}}}
</mermaid_graph>
{{/if}}
{{#if gitCommitGraph.tags}}
<tags>
{{#each gitCommitGraph.tags}}
<tag name="{{{@key}}}">{{{this}}}</tag>
{{/each}}
</tags>
{{/if}}
</commit_graph>
{{/if}}

{{#each gitLogCommits}}
<git_log_commit>
<date>{{{this.date}}}</date>
<message>{{{this.message}}}</message>
<files>
{{#each this.files}}
{{{this}}}
{{/each}}
</files>
{{#if this.hash}}
<hash>{{{this.hash}}}</hash>
{{/if}}
{{#if this.abbreviatedHash}}
<abbreviated_hash>{{{this.abbreviatedHash}}}</abbreviated_hash>
{{/if}}
{{#if this.author}}
<author>
<name>{{{this.author.name}}}</name>
<email>{{{this.author.email}}}</email>
<date>{{{this.author.date}}}</date>
</author>
{{/if}}
{{#if this.committer}}
<committer>
<name>{{{this.committer.name}}}</name>
<email>{{{this.committer.email}}}</email>
<date>{{{this.committer.date}}}</date>
</committer>
{{/if}}
{{#if this.parents}}
<parents>
{{#each this.parents}}
<parent>{{{this}}}</parent>
{{/each}}
</parents>
{{/if}}
{{#if this.body}}
<body>{{{this.body}}}</body>
{{/if}}
{{#if this.patch}}
<patch>
{{{this.patch}}}
</patch>
{{/if}}
</git_log_commit>
{{/each}}
</git_logs>
{{/if}}

{{#if instruction}}
<instruction>
{{{instruction}}}
</instruction>
{{/if}}
`;
};
