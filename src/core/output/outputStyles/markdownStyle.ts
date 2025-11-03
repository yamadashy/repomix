import Handlebars from 'handlebars';

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
{{{this.content}}}{{#if this.truncation.truncated}}

// ... (truncated: showing {{this.truncation.truncatedLineCount}} of {{this.truncation.originalLineCount}} lines){{/if}}
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

Handlebars.registerHelper('getFileExtension', (filePath) => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'vue':
      return 'vue';
    case 'py':
      return 'python';
    case 'rb':
      return 'ruby';
    case 'java':
      return 'java';
    case 'c':
    case 'cpp':
      return 'cpp';
    case 'cs':
      return 'csharp';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'php':
      return 'php';
    case 'swift':
      return 'swift';
    case 'kt':
      return 'kotlin';
    case 'scala':
      return 'scala';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
      return 'scss';
    case 'json':
      return 'json';
    case 'json5':
      return 'json5';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'md':
      return 'markdown';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'sql':
      return 'sql';
    case 'dockerfile':
      return 'dockerfile';
    case 'dart':
      return 'dart';
    case 'fs':
    case 'fsx':
      return 'fsharp';
    case 'r':
      return 'r';
    case 'pl':
    case 'pm':
      return 'perl';
    case 'lua':
      return 'lua';
    case 'groovy':
      return 'groovy';
    case 'hs':
      return 'haskell';
    case 'ex':
    case 'exs':
      return 'elixir';
    case 'erl':
      return 'erlang';
    case 'clj':
    case 'cljs':
      return 'clojure';
    case 'ps1':
      return 'powershell';
    case 'vb':
      return 'vb';
    case 'coffee':
      return 'coffeescript';
    case 'tf':
    case 'tfvars':
      return 'hcl';
    case 'proto':
      return 'protobuf';
    case 'pug':
      return 'pug';
    case 'graphql':
    case 'gql':
      return 'graphql';
    case 'toml':
      return 'toml';
    default:
      return '';
  }
});
