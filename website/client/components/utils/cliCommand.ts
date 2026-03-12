import { isValidRemoteValue } from './validation.js';

export interface CliCommandPackOptions {
  format?: string;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  showLineNumbers?: boolean;
  fileSummary?: boolean;
  directoryStructure?: boolean;
  includePatterns?: string;
  ignorePatterns?: string;
  outputParsable?: boolean;
  compress?: boolean;
}

// Escape a string for safe use in shell commands
const shellEscape = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

export function generateCliCommand(repositoryUrl: string | undefined, packOptions?: CliCommandPackOptions): string {
  const parts: string[] = ['npx repomix'];

  // Add remote repository URL (only for valid remote values, not uploaded file names)
  if (repositoryUrl && isValidRemoteValue(repositoryUrl)) {
    parts.push(`--remote ${shellEscape(repositoryUrl)}`);
  }

  // Only add options if packOptions is provided
  if (packOptions) {
    // Format (only add if not default 'xml')
    if (packOptions.format && packOptions.format !== 'xml') {
      parts.push(`--style ${packOptions.format}`);
    }

    // Boolean flags that enable features
    if (packOptions.removeComments) {
      parts.push('--remove-comments');
    }
    if (packOptions.removeEmptyLines) {
      parts.push('--remove-empty-lines');
    }
    if (packOptions.showLineNumbers) {
      parts.push('--output-show-line-numbers');
    }
    if (packOptions.outputParsable) {
      parts.push('--parsable-style');
    }
    if (packOptions.compress) {
      parts.push('--compress');
    }

    // Boolean flags that disable defaults (fileSummary and directoryStructure default to true)
    if (packOptions.fileSummary === false) {
      parts.push('--no-file-summary');
    }
    if (packOptions.directoryStructure === false) {
      parts.push('--no-directory-structure');
    }

    // String options
    if (packOptions.includePatterns?.trim()) {
      parts.push(`--include ${shellEscape(packOptions.includePatterns.trim())}`);
    }
    if (packOptions.ignorePatterns?.trim()) {
      parts.push(`--ignore ${shellEscape(packOptions.ignorePatterns.trim())}`);
    }
  }

  return parts.join(' ');
}
