import type { PackOptions } from '../../composables/usePackOptions';

export function generateCliCommand(repositoryUrl: string | undefined, packOptions?: PackOptions): string {
  const parts: string[] = ['npx repomix'];

  // Add remote repository URL
  if (repositoryUrl) {
    parts.push(`--remote ${repositoryUrl}`);
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
      parts.push(`--include "${packOptions.includePatterns.trim()}"`);
    }
    if (packOptions.ignorePatterns?.trim()) {
      parts.push(`--ignore "${packOptions.ignorePatterns.trim()}"`);
    }
  }

  return parts.join(' ');
}
