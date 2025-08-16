import type { PackOptions } from '../composables/usePackOptions';

export function parseUrlParameters(): Partial<PackOptions & { repo?: string }> {
  if (typeof window === 'undefined') {
    return {};
  }

  const urlParams = new URLSearchParams(window.location.search);
  const params: Partial<PackOptions & { repo?: string }> = {};

  // Repository URL parameter
  const repo = urlParams.get('repo');
  if (repo) {
    params.repo = repo.trim();
  }

  // Format parameter
  const format = urlParams.get('format');
  if (format && ['xml', 'markdown', 'plain'].includes(format)) {
    params.format = format as 'xml' | 'markdown' | 'plain';
  }

  // Style parameter (alternative to format for backward compatibility)
  const style = urlParams.get('style');
  if (style && ['xml', 'markdown', 'plain'].includes(style)) {
    params.format = style as 'xml' | 'markdown' | 'plain';
  }

  // Include patterns
  const include = urlParams.get('include');
  if (include) {
    params.includePatterns = include;
  }

  // Ignore patterns
  const ignore = urlParams.get('ignore');
  if (ignore) {
    params.ignorePatterns = ignore;
  }

  // Boolean parameters
  const booleanParams = [
    'removeComments',
    'removeEmptyLines',
    'showLineNumbers',
    'fileSummary',
    'directoryStructure',
    'outputParsable',
    'compress',
  ] as const;

  for (const param of booleanParams) {
    const value = urlParams.get(param);
    if (value !== null) {
      // Accept various truthy values: true, 1, yes, on
      params[param] = ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
  }

  return params;
}

export function updateUrlParameters(options: Partial<PackOptions & { repo?: string }>): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const params = url.searchParams;

  // Clear existing repomix-related parameters
  const keysToRemove = [
    'repo',
    'format',
    'style',
    'include',
    'ignore',
    'removeComments',
    'removeEmptyLines',
    'showLineNumbers',
    'fileSummary',
    'directoryStructure',
    'outputParsable',
    'compress',
  ];

  for (const key of keysToRemove) {
    params.delete(key);
  }

  // Add new parameters
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'boolean') {
        params.set(key, value.toString());
      } else if (typeof value === 'string' && value.trim() !== '') {
        params.set(key, value.trim());
      }
    }
  }

  // Update URL without reloading the page
  window.history.replaceState({}, '', url.toString());
}
