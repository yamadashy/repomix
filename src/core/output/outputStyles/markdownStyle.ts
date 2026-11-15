import type { ProcessedFile } from '../../file/fileTypes.js';
import type { GitLogCommit } from '../../git/gitLogHandle.js';
import type { RenderContext } from '../outputGeneratorTypes.js';
import { getLanguageFromFilePath, renderEach } from '../outputStyleUtils.js';

// Values are inserted verbatim. Each section carries its own trailing newline(s);
// the bare '\n' entries in renderMarkdownStyle are fixed separators emitted even
// when a neighbouring section is disabled. The caller trims the result.

const renderFileSummary = (context: RenderContext): string => `${context.generationHeader}

# File Summary

## Purpose
${context.summaryPurpose}

## File Format
${context.summaryFileFormat}
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
${context.summaryUsageGuidelines}

## Notes
${context.summaryNotes}

`;

const renderHeader = (headerText: string): string => `# User Provided Header\n${headerText}\n\n`;

const renderDirectoryStructure = (treeString: string, delimiter: string): string =>
  `# Directory Structure\n${delimiter}\n${treeString}\n${delimiter}\n\n`;

/**
 * Renders one `## File:` entry with its contents in a fenced code block.
 * Shared with the skill output's files section.
 */
export const renderMarkdownFile = (file: ProcessedFile, delimiter: string): string =>
  `## File: ${file.path}\n${delimiter}${getLanguageFromFilePath(file.path)}\n${file.content}\n${delimiter}\n\n`;

const renderFiles = (context: RenderContext): string =>
  `# Files\n\n${renderEach(context.processedFiles, (file) => renderMarkdownFile(file, context.markdownCodeBlockDelimiter))}`;

const renderGitDiffs = (context: RenderContext): string => {
  const delimiter = context.markdownCodeBlockDelimiter;
  return `# Git Diffs
## Git Diffs Working Tree
${delimiter}diff
${context.gitDiffWorkTree ?? ''}
${delimiter}

## Git Diffs Staged
${delimiter}diff
${context.gitDiffStaged ?? ''}
${delimiter}

`;
};

const renderGitLogCommit = (commit: GitLogCommit): string =>
  `## Commit: ${commit.date}\n**Message:** ${commit.message}\n\n**Files:**\n${renderEach(commit.files, (file) => `- ${file}\n`)}\n`;

const renderGitLogs = (commits: ReadonlyArray<GitLogCommit> | undefined): string =>
  `# Git Logs\n\n${renderEach(commits, renderGitLogCommit)}`;

const renderInstruction = (instruction: string): string => `# Instruction\n${instruction}\n`;

export const renderMarkdownStyle = (context: RenderContext): string =>
  [
    context.fileSummaryEnabled ? renderFileSummary(context) : '',
    context.headerText ? renderHeader(context.headerText) : '',
    context.directoryStructureEnabled
      ? renderDirectoryStructure(context.treeString, context.markdownCodeBlockDelimiter)
      : '',
    context.filesEnabled ? renderFiles(context) : '',
    '\n',
    context.gitDiffEnabled ? renderGitDiffs(context) : '',
    '\n',
    context.gitLogEnabled ? renderGitLogs(context.gitLogCommits) : '',
    '\n',
    context.instruction ? renderInstruction(context.instruction) : '',
  ].join('');
