import type { OptionValues } from 'commander';
import type { RepomixOutputStyle } from '../config/configSchema.js';

export interface CliOptions extends OptionValues {
  version?: boolean;
  output?: string;
  include?: string;
  ignore?: string;
  gitignore?: boolean;
  defaultPatterns?: boolean;
  config?: string;
  copy?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  topFilesLen?: number;
  outputShowLineNumbers?: boolean;
  style?: RepomixOutputStyle;
  parsableStyle?: boolean;
  init?: boolean;
  global?: boolean;
  remote?: string;
  remoteBranch?: string;
  securityCheck?: boolean;
  fileSummary?: boolean;
  headerText?: string;
  directoryStructure?: boolean;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  tokenCountEncoding?: string;
  instructionFilePath?: string;
  includeEmptyDirectories?: boolean;
  mcp?: boolean;
}
