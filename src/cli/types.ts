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
  splitOutput?: number; // bytes
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
  remoteTrustConfig?: boolean;
  skipLocalConfig?: boolean; // Internal flag: skip loading config files from the working directory (e.g., untrusted remote repos)
  deferTokenBudgetCheck?: boolean; // Internal flag: skip the token-budget check inside runDefaultAction so the caller can enforce it after delivering output (e.g., remote runs copy out of the temp dir first)

  // Configuration Options
  config?: string;
  init?: boolean;
  global?: boolean;

  // Security Options
  securityCheck?: boolean;

  // Token Count Options
  tokenCountEncoding?: string;
  tokenCountTree?: boolean | number;
  tokenBudget?: number;

  // MCP
  mcp?: boolean;

  // Skill Generation
  skillGenerate?: string | boolean;
  skillName?: string; // Pre-computed skill name (used internally for remote repos)
  skillDir?: string; // Pre-computed skill directory (used internally for remote repos)
  skillProjectName?: string; // Project name for generated skill descriptions
  skillSourceUrl?: string; // Source URL for skill (used internally for remote repos only)
  skillOutput?: string; // Output path for skill (skips location prompt)
  force?: boolean; // Skip all confirmation prompts

  // Watch Mode
  watch?: boolean;

  // Other Options
  topFilesLen?: number;
  verbose?: boolean;
  quiet?: boolean;
}
