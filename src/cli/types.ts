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

  // Skill Generation
  generateSkill?: string;

  // Other Options
  topFilesLen?: number;
  verbose?: boolean;
  quiet?: boolean;
}
