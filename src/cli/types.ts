import type { OptionValues } from 'commander';
import type { RepomixOutputStyle } from '../config/configSchema.js';

export interface CliOptions extends OptionValues {
  // Basic Options
  version?: boolean;

  // Output Options
  output?: string;
  stdout?: boolean;
  style?: RepomixOutputStyle;
  parsableStyle?: boolean;
  compress?: boolean;
  outputShowLineNumbers?: boolean;
  copy?: boolean;
  fileSummary?: boolean;
  directoryStructure?: boolean;
  files?: boolean;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  truncateBase64?: boolean;
  headerText?: string;
  instructionFilePath?: string;
  includeEmptyDirectories?: boolean;
  includeFullDirectoryStructure?: boolean;
  gitSortByChanges?: boolean;
  includeDiffs?: boolean;
  includeLogs?: boolean;
  includeLogsCount?: number;
  commitRange?: string;

  // Git Log Diff Format Flags (mutually exclusive)
  stat?: boolean; // git log --stat: diffstat histogram
  patch?: boolean; // git log --patch: line-by-line diffs
  numstat?: boolean; // git log --numstat: numeric additions/deletions
  shortstat?: boolean; // git log --shortstat: one-line summary
  dirstat?: boolean; // git log --dirstat: directory distribution
  nameOnly?: boolean; // git log --name-only: filenames only
  nameStatus?: boolean; // git log --name-status: filenames with status
  raw?: boolean; // git log --raw: low-level format

  // Git Log Output Verbosity & Graph Options (combinable with diff formats)
  graph?: boolean; // git log --graph: show commit graph
  summary?: boolean; // git log --summary: show file operations (creates, renames, mode changes)

  // Filter Options
  include?: string;
  ignore?: string;
  gitignore?: boolean;
  dotIgnore?: boolean;
  defaultPatterns?: boolean;
  stdin?: boolean;

  // Remote Repository Options
  remote?: string;
  remoteBranch?: string;

  // Configuration Options
  config?: string;
  init?: boolean;
  global?: boolean;

  // Security Options
  securityCheck?: boolean;

  // Token Count Options
  tokenCountEncoding?: string;
  tokenCountTree?: boolean | number;

  // MCP
  mcp?: boolean;

  // Other Options
  topFilesLen?: number;
  verbose?: boolean;
  quiet?: boolean;
}
