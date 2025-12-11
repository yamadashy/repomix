import Handlebars from 'handlebars';
import { generateTreeStringWithLineCounts } from '../file/fileTreeGenerate.js';
import type { RenderContext } from '../output/outputGeneratorTypes.js';
import { registerHandlebarsHelpers } from '../output/outputStyleUtils.js';

// Register Handlebars helpers (idempotent)
registerHandlebarsHelpers();

/**
 * Generates the summary section for skill output.
 * Contains purpose, file format, usage guidelines, notes, and project statistics.
 */
export const generateSummarySection = (context: RenderContext, statisticsSection?: string): string => {
  const template = Handlebars.compile(`{{{generationHeader}}}

# Summary

## Purpose

This is a reference codebase organized into multiple files for AI consumption.
It is designed to be easily searchable using grep and other text-based tools.

## File Structure

This skill contains the following reference files:

| File | Contents |
|------|----------|
| \`project-structure.md\` | Directory tree with line counts per file |
| \`files.md\` | All file contents (search with \`## File: <path>\`) |
| \`tech-stack.md\` | Languages, frameworks, and dependencies |
| \`summary.md\` | This file - purpose and format explanation |

## Usage Guidelines

{{{summaryUsageGuidelines}}}

## Notes

{{{summaryNotes}}}

{{#if statisticsSection}}
{{{statisticsSection}}}
{{/if}}
`);

  return template({ ...context, statisticsSection }).trim();
};

/**
 * Generates the directory structure section for skill output.
 * Includes line counts for each file to aid in grep searches.
 */
export const generateStructureSection = (context: RenderContext): string => {
  if (!context.directoryStructureEnabled) {
    return '';
  }

  // Generate tree string with line counts for skill output
  const filePaths = context.processedFiles.map((f) => f.path);
  const treeStringWithLineCounts = generateTreeStringWithLineCounts(filePaths, context.fileLineCounts);

  const template = Handlebars.compile(`# Directory Structure

\`\`\`
{{{treeString}}}
\`\`\`
`);

  return template({ treeString: treeStringWithLineCounts }).trim();
};

/**
 * Generates the files section for skill output.
 * Contains all file contents with syntax highlighting.
 */
export const generateFilesSection = (context: RenderContext): string => {
  if (!context.filesEnabled) {
    return '';
  }

  const template = Handlebars.compile(`# Files

{{#each processedFiles}}
## File: {{{this.path}}}
{{{../markdownCodeBlockDelimiter}}}{{{getFileExtension this.path}}}
{{{this.content}}}
{{{../markdownCodeBlockDelimiter}}}

{{/each}}
`);

  return template(context).trim();
};
