import type { OptionValues } from 'commander';
import type { RepomixOutputStyle } from '../config/configSchema.js';

export interface CliOptions extends OptionValues {
  // Basic Options
  version?: boolean;

  // Output Options
  output?: string;
  style?: RepomixOutputStyle;
  parsableStyle?: boolean;
  compress?: boolean;
  outputShowLineNumbers?: boolean;
  copy?: boolean;
  fileSummary?: boolean;
  directoryStructure?: boolean;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  headerText?: string;
  instructionFilePath?: string;
  includeEmptyDirectories?: boolean;
  gitSortByChanges?: boolean;

  // Filter Options
  include?: string;
  ignore?: string;
  gitignore?: boolean;
  defaultPatterns?: boolean;

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

  // MCP
  mcp?: boolean;

  // Other Options
  topFilesLen?: number;
  verbose?: boolean;
  quiet?: boolean;
}
