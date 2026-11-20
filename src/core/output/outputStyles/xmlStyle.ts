import type { ProcessedFile } from '../../file/fileTypes.js';
import type { GitLogCommit } from '../../git/gitLogHandle.js';
import type { RenderContext } from '../outputGeneratorTypes.js';
import { renderEach } from '../outputStyleUtils.js';

// Values are inserted verbatim, without XML escaping: this style has always emitted
// raw content (`--parsable-style` XML goes through fast-xml-builder instead).
// Each section carries its own trailing newline(s); the bare '\n' entries in
// renderXmlStyle are fixed separators emitted even when a neighbouring section is
// disabled. The caller trims the result.

const renderFileSummary = (context: RenderContext): string => `${context.generationHeader}

<file_summary>
This section contains a summary of this file.

<purpose>
${context.summaryPurpose}
</purpose>

<file_format>
${context.summaryFileFormat}
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
${context.summaryUsageGuidelines}
</usage_guidelines>

<notes>
${context.summaryNotes}
</notes>

</file_summary>

`;

const renderHeader = (headerText: string): string =>
  `<user_provided_header>\n${headerText}\n</user_provided_header>\n\n`;

const renderDirectoryStructure = (treeString: string): string =>
  `<directory_structure>\n${treeString}\n</directory_structure>\n\n`;

const renderFile = (file: ProcessedFile): string => `<file path="${file.path}">\n${file.content}\n</file>\n\n`;

const renderFiles = (files: ReadonlyArray<ProcessedFile>): string =>
  `<files>\nThis section contains the contents of the repository's files.\n\n${renderEach(files, renderFile)}</files>\n`;

const renderGitDiffs = (context: RenderContext): string => `<git_diffs>
<git_diff_work_tree>
${context.gitDiffWorkTree ?? ''}
</git_diff_work_tree>
<git_diff_staged>
${context.gitDiffStaged ?? ''}
</git_diff_staged>
</git_diffs>
`;

const renderGitLogCommit = (commit: GitLogCommit): string => `<git_log_commit>
<date>${commit.date}</date>
<message>${commit.message}</message>
<files>
${renderEach(commit.files, (file) => `${file}\n`)}</files>
</git_log_commit>
`;

const renderGitLogs = (commits: ReadonlyArray<GitLogCommit> | undefined): string =>
  `<git_logs>\n${renderEach(commits, renderGitLogCommit)}</git_logs>\n`;

const renderInstruction = (instruction: string): string => `<instruction>\n${instruction}\n</instruction>\n`;

export const renderXmlStyle = (context: RenderContext): string =>
  [
    context.fileSummaryEnabled ? renderFileSummary(context) : '',
    context.headerText ? renderHeader(context.headerText) : '',
    context.directoryStructureEnabled ? renderDirectoryStructure(context.treeString) : '',
    context.filesEnabled ? renderFiles(context.processedFiles) : '',
    '\n',
    context.gitDiffEnabled ? renderGitDiffs(context) : '',
    '\n',
    context.gitLogEnabled ? renderGitLogs(context.gitLogCommits) : '',
    '\n',
    context.instruction ? renderInstruction(context.instruction) : '',
  ].join('');
