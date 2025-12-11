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

{{#each gitLogCommits}}
## Commit: {{{this.date}}}
**Message:** {{{this.message}}}

**Files:**
{{#each this.files}}
- {{{this}}}
{{/each}}

{{/each}}
{{/if}}

{{#if instruction}}
# Instruction
{{{instruction}}}
{{/if}}
`;
};
