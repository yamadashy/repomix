import type { ProcessedFile } from '../../file/fileTypes.js';
import type { GitLogCommit } from '../../git/gitLogHandle.js';
import type { RenderContext } from '../outputGeneratorTypes.js';
import { renderEach } from '../outputStyleUtils.js';

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);

// Values are inserted verbatim. Each section carries its own trailing newline(s);
// the bare '\n' entries in renderPlainStyle are fixed separators emitted even
// when a neighbouring section is disabled. The caller trims the result.

const renderHeading = (title: string): string => `${PLAIN_LONG_SEPARATOR}\n${title}\n${PLAIN_LONG_SEPARATOR}\n`;

const renderFileSummary = (context: RenderContext): string => `${context.generationHeader}

${renderHeading('File Summary')}
Purpose:
--------
${context.summaryPurpose}

File Format:
------------
${context.summaryFileFormat}
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
${context.summaryUsageGuidelines}

Notes:
------
${context.summaryNotes}

`;

const renderHeader = (headerText: string): string => `${renderHeading('User Provided Header')}${headerText}\n\n`;

const renderDirectoryStructure = (treeString: string): string =>
  `${renderHeading('Directory Structure')}${treeString}\n\n`;

const renderFile = (file: ProcessedFile): string =>
  `${PLAIN_SEPARATOR}\nFile: ${file.path}\n${PLAIN_SEPARATOR}\n${file.content}\n\n`;

const renderFiles = (files: ReadonlyArray<ProcessedFile>): string =>
  `${renderHeading('Files')}\n${renderEach(files, renderFile)}`;

const renderGitDiffs = (context: RenderContext): string => `${renderHeading('Git Diffs')}${PLAIN_SEPARATOR}
${context.gitDiffWorkTree ?? ''}
${PLAIN_SEPARATOR}

${PLAIN_SEPARATOR}
Git Diffs Staged
${PLAIN_SEPARATOR}
${context.gitDiffStaged ?? ''}

`;

const renderGitLogCommit = (commit: GitLogCommit): string =>
  `${PLAIN_SEPARATOR}\nDate: ${commit.date}\nMessage: ${commit.message}\nFiles:\n${renderEach(commit.files, (file) => `  - ${file}\n`)}${PLAIN_SEPARATOR}\n\n`;

const renderGitLogs = (commits: ReadonlyArray<GitLogCommit> | undefined): string =>
  `${renderHeading('Git Logs')}${renderEach(commits, renderGitLogCommit)}\n`;

const renderInstruction = (instruction: string): string => `${renderHeading('Instruction')}${instruction}\n`;

export const renderPlainStyle = (context: RenderContext): string =>
  [
    context.fileSummaryEnabled ? renderFileSummary(context) : '',
    '\n',
    context.headerText ? renderHeader(context.headerText) : '',
    context.directoryStructureEnabled ? renderDirectoryStructure(context.treeString) : '',
    context.filesEnabled ? renderFiles(context.processedFiles) : '',
    '\n',
    context.gitDiffEnabled ? renderGitDiffs(context) : '',
    '\n',
    context.gitLogEnabled ? renderGitLogs(context.gitLogCommits) : '',
    '\n',
    context.instruction ? renderInstruction(context.instruction) : '',
    '\n',
    renderHeading('End of Codebase'),
  ].join('');
