import type { PackOptions } from '../composables/usePackOptions';

// URL parameter constants
const BOOLEAN_PARAMS = [
  'removeComments',
  'removeEmptyLines',
  'showLineNumbers',
  'fileSummary',
  'directoryStructure',
  'outputParsable',
  'compress',
] as const;

const VALID_FORMATS = ['xml', 'markdown', 'plain'] as const;

const URL_PARAM_KEYS = ['repo', 'format', 'style', 'include', 'ignore', ...BOOLEAN_PARAMS] as const;

// Key mapping for internal names to URL parameter names
const KEY_MAPPING: Record<string, string> = {
  includePatterns: 'include',
  ignorePatterns: 'ignore',
};

// Helper function to get URL parameter key from internal key
function getUrlParamKey(internalKey: string): string {
  return KEY_MAPPING[internalKey] || internalKey;
}

// Helper function to validate URL parameter values
export function validateUrlParameters(params: Record<string, unknown>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate format parameter
  if (params.format && !(VALID_FORMATS as readonly string[]).includes(params.format as string)) {
    errors.push(`Invalid format: ${params.format}. Must be one of: ${VALID_FORMATS.join(', ')}`);
  }

  // Validate URL length to prevent browser limit issues
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      urlSearchParams.set(key, String(value));
    }
  }

  const maxUrlLength = 2000; // Conservative limit for browser compatibility
  if (urlSearchParams.toString().length > maxUrlLength) {
    errors.push(
      `URL parameters too long (${urlSearchParams.toString().length} chars). Maximum allowed: ${maxUrlLength}`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper function to check if any options differ from defaults
export function hasNonDefaultValues(
  inputUrl: string,
  packOptions: Record<string, unknown>,
  defaultOptions: Record<string, unknown>,
): boolean {
  // Check if there's input URL
  if (inputUrl && inputUrl.trim() !== '') {
    return true;
  }

  // Check if any pack option differs from default
  for (const [key, value] of Object.entries(packOptions)) {
    const defaultValue = defaultOptions[key];
    if (typeof value === 'string' && typeof defaultValue === 'string') {
      if (value.trim() !== defaultValue.trim()) {
        return true;
      }
    } else if (value !== defaultValue) {
      return true;
    }
  }

  return false;
}

/**
 * Parses URL query parameters and returns pack options and repository URL.
 * Supports backward compatibility with 'style' parameter as alias for 'format'.
 *
 * @returns Parsed options object with repository URL and pack options
 */
export function parseUrlParameters(): Partial<PackOptions & { repo?: string }> {
  if (typeof window === 'undefined') {
    return {};
  }

  const urlParams = new URLSearchParams(window.location.search);
  const params: Partial<PackOptions & { repo?: string }> = {};
  
  // Debug: Log current URL parameters
  console.debug('[URL Params] Current URL search:', window.location.search);
  console.debug('[URL Params] Parsed params:', Array.from(urlParams.entries()));

  // Repository URL parameter
  const repo = urlParams.get('repo');
  if (repo) {
    params.repo = repo.trim();
  }

  // Format and Style parameters (with conflict handling)
  const format = urlParams.get('format');
  const style = urlParams.get('style');

  if (
    format &&
    (VALID_FORMATS as readonly string[]).includes(format) &&
    style &&
    (VALID_FORMATS as readonly string[]).includes(style)
  ) {
    // Both present: prefer format, warn about conflict
    params.format = format as (typeof VALID_FORMATS)[number];
    console.warn(
      `Both 'format' and 'style' URL parameters are present. Using 'format=${format}' and ignoring 'style=${style}'.`,
    );
  } else if (format && (VALID_FORMATS as readonly string[]).includes(format)) {
    params.format = format as (typeof VALID_FORMATS)[number];
  } else if (style && (VALID_FORMATS as readonly string[]).includes(style)) {
    params.format = style as (typeof VALID_FORMATS)[number];
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
  for (const param of BOOLEAN_PARAMS) {
    const value = urlParams.get(param);
    if (value !== null) {
      // Accept various truthy values: true, 1, yes, on
      params[param] = ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
  }

  return params;
}

/**
 * Updates URL query parameters with the provided options.
 * Validates parameters and provides error handling for URL length limits.
 *
 * @param options - Pack options and repository URL to set in URL
 * @returns Result object with success status and optional error message
 */
export function updateUrlParameters(options: Partial<PackOptions & { repo?: string }>): {
  success: boolean;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window object not available (SSR environment)' };
  }

  try {
    // Validate parameters before updating URL
    const validation = validateUrlParameters(options);
    if (!validation.isValid) {
      // If validation fails due to URL length, return error instead of continuing
      const hasLengthError = validation.errors.some((error) => error.includes('too long'));
      if (hasLengthError) {
        return { success: false, error: validation.errors.join('; ') };
      }
      // For other validation errors, just warn and continue
      console.warn('URL parameter validation failed:', validation.errors);
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Clear existing repomix-related parameters
    for (const key of URL_PARAM_KEYS) {
      params.delete(key);
    }

    // Add new parameters
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        const urlParamKey = getUrlParamKey(key);
        if (typeof value === 'boolean') {
          params.set(urlParamKey, value.toString());
        } else if (typeof value === 'string' && value.trim() !== '') {
          params.set(urlParamKey, value.trim());
        }
      }
    }

    // Update URL without reloading the page
    window.history.replaceState({}, '', url.toString());
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while updating URL';
    console.error('Failed to update URL parameters:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
