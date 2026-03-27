import { registerHandlebarsHelpers } from '../outputStyleUtils.js';

// Register Handlebars helpers (idempotent)
registerHandlebarsHelpers();

export const getMarkdownTemplate = () => {
  return /* md */ `
{{#if fileSummaryEnabled}}
{{{generationHeader}}}

# File Summary

## Purpose
{{{summaryPurpose}}}

## File Format
{{{summaryFileFormat}}}
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
{{{summaryUsageGuidelines}}}

## Notes
{{{summaryNotes}}}

{{/if}}
{{#if headerText}}
# User Provided Header
{{{headerText}}}

{{/if}}
{{#if directoryStructureEnabled}}
# Directory Structure
\`\`\`
{{{treeString}}}
\`\`\`

{{/if}}
{{#if filesEnabled}}
# Files

{{#each processedFiles}}
## File: {{{this.path}}}
{{{../markdownCodeBlockDelimiter}}}{{{getFileExtension this.path}}}
{{{this.content}}}
{{{../markdownCodeBlockDelimiter}}}

{{/each}}
{{/if}}

{{#if gitDiffEnabled}}
# Git Diffs
## Git Diffs Working Tree
\`\`\`diff
{{{gitDiffWorkTree}}}
\`\`\`

## Git Diffs Staged
\`\`\`diff
{{{gitDiffStaged}}}
\`\`\`

{{/if}}

{{#if gitLogEnabled}}
# Git Logs

{{#if gitCommitHistorySummary}}
## Summary
- **Total Commits**: {{{gitCommitHistorySummary.totalCommits}}}
- **Merge Commits**: {{{gitCommitHistorySummary.mergeCommits}}}
- **Range**: \`{{{gitCommitHistorySummary.range}}}\`
- **Detail Level**: {{{gitCommitHistorySummary.detailLevel}}}

{{/if}}

{{#if gitCommitGraph}}
## Commit Graph

### Topology (ASCII)
\`\`\`
{{{gitCommitGraph.graph}}}
\`\`\`

{{#if gitCommitGraph.mermaidGraph}}
### Mermaid Diagram
\`\`\`mermaid
{{{gitCommitGraph.mermaidGraph}}}
\`\`\`
{{/if}}

{{#if gitCommitGraph.tags}}
### Tags
{{#each gitCommitGraph.tags}}
- **{{{@key}}}**: \`{{{this}}}\`
{{/each}}
{{/if}}

{{/if}}

## Commits

{{#each gitLogCommits}}
### Commit: {{{this.date}}}{{#if this.abbreviatedHash}} ({{{this.abbreviatedHash}}}){{/if}}

{{#if this.hash}}
**Hash**: \`{{{this.hash}}}\`
{{/if}}
{{#if this.author}}
**Author**: {{{this.author.name}}} <{{{this.author.email}}}>
{{/if}}
**Message**: {{{this.message}}}

{{#if this.parents}}
**Parents**: {{#each this.parents}}\`{{{this}}}\` {{/each}}

{{/if}}
{{#if this.body}}
**Body**:
\`\`\`
{{{this.body}}}
\`\`\`

{{/if}}
**Files Changed**:
{{#each this.files}}
- \`{{{this}}}\`
{{/each}}

{{#if this.patch}}
**Changes**:
\`\`\`diff
{{{this.patch}}}
\`\`\`
{{/if}}

---

{{/each}}
{{/if}}

{{#if instruction}}
# Instruction
{{{instruction}}}
{{/if}}
`;
};
