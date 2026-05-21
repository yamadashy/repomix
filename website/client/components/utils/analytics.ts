// Analytics event categories
export const AnalyticsCategory = {
  REPOSITORY: 'repository',
  FORMAT: 'format',
  OPTIONS: 'options',
  OUTPUT: 'output',
} as const;

// Analytics event actions
export const AnalyticsAction = {
  // Repository events
  PACK_START: 'pack_start',
  PACK_SUCCESS: 'pack_success',
  PACK_SUCCESS_FILES: 'pack_success_files',
  PACK_SUCCESS_CHARS: 'pack_success_chars',
  PACK_ERROR: 'pack_error',

  // Format events
  FORMAT_CHANGE: 'format_change',

  // Options events
  TOGGLE_REMOVE_COMMENTS: 'toggle_remove_comments',
  TOGGLE_REMOVE_EMPTY_LINES: 'toggle_remove_empty_lines',
  TOGGLE_LINE_NUMBERS: 'toggle_line_numbers',
  TOGGLE_FILE_SUMMARY: 'toggle_file_summary',
  TOGGLE_DIRECTORY_STRUCTURE: 'toggle_directory_structure',
  TOGGLE_OUTPUT_PARSABLE: 'toggle_output_parsable',
  TOGGLE_COMPRESS: 'toggle_compress',
  UPDATE_INCLUDE_PATTERNS: 'update_include_patterns',
  UPDATE_IGNORE_PATTERNS: 'update_ignore_patterns',

  // Output events
  COPY_OUTPUT: 'copy_output',
  DOWNLOAD_OUTPUT: 'download_output',
  SHARE_OUTPUT: 'share_output',
} as const;

export type AnalyticsCategoryType = (typeof AnalyticsCategory)[keyof typeof AnalyticsCategory];
export type AnalyticsActionType = (typeof AnalyticsAction)[keyof typeof AnalyticsAction];

// Google Analytics event tracking interface
interface GAEventParams {
  category: AnalyticsCategoryType;
  action: AnalyticsActionType;
  label?: string;
  value?: number;
}

// Reduce a user-supplied repo identifier to a privacy-safe label.
// Strips query/hash/credentials and avoids forwarding raw URLs (which may
// contain tokens or private host names) into Google Analytics.
export function normalizeRepoLabel(input: string): string {
  // Strip trailing slashes so `owner/repo/` still matches the shorthand
  // regex below instead of falling through to URL parsing and returning
  // `invalid`.
  const trimmed = input?.trim().replace(/\/+$/, '') ?? '';
  if (trimmed === '') return 'none';

  // GitHub shorthand: owner/repo
  if (/^[a-zA-Z0-9][\w.-]*\/[a-zA-Z0-9][\w.-]*$/.test(trimmed)) {
    return `github:${trimmed.replace(/\.git$/, '')}`;
  }

  try {
    const url = new URL(trimmed);
    // Drop `www.` so `www.github.com/...` normalizes to the same `github:*`
    // label as the canonical host.
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const segments = url.pathname.split('/').filter(Boolean);

    if (host === 'github.com' && segments.length >= 2) {
      const repo = segments[1].replace(/\.git$/, '');
      return `github:${segments[0]}/${repo}`;
    }
    if (host === 'gist.github.com' && segments.length >= 1) {
      // Gist URLs come in two forms: `/<id>` (GitHub redirects to the user
      // form) and `/<user>/<id>`. Handle both rather than leaking single-id
      // URLs as `external:gist.github.com`.
      if (segments.length === 1) return `gist:${segments[0]}`;
      return `gist:${segments[0]}/${segments[1]}`;
    }
    return `external:${host}`;
  } catch {
    return 'invalid';
  }
}

export type ErrorCategory =
  | 'timeout'
  | 'rate_limit'
  | 'not_found'
  | 'verification'
  | 'invalid_input'
  | 'network'
  | 'server'
  | 'unknown';

// Map a free-form error message to a stable category code so analytics
// labels stay bounded and do not echo server-supplied strings verbatim.
export function classifyError(message: string): ErrorCategory {
  const lower = (message ?? '').toLowerCase();
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) return 'rate_limit';
  if (lower.includes('not found') || lower.includes('404')) return 'not_found';
  if (lower.includes('turnstile') || lower.includes('verification') || lower.includes('verify')) {
    return 'verification';
  }
  if (lower.includes('invalid') || lower.includes('format')) return 'invalid_input';
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('cors')) return 'network';
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('server')) {
    return 'server';
  }
  return 'unknown';
}

// Track an event using gtag
export function trackEvent({ category, action, label, value }: GAEventParams): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// Analytics utility functions for specific events
export const analyticsUtils = {
  // Repository events
  trackPackStart(repoUrl: string): void {
    trackEvent({
      category: AnalyticsCategory.REPOSITORY,
      action: AnalyticsAction.PACK_START,
      label: normalizeRepoLabel(repoUrl),
    });
  },

  trackPackSuccess(repoUrl: string, totalFiles: number, totalChars: number): void {
    const label = normalizeRepoLabel(repoUrl);
    trackEvent({
      category: AnalyticsCategory.REPOSITORY,
      action: AnalyticsAction.PACK_SUCCESS_FILES,
      label,
      value: totalFiles,
    });
    trackEvent({
      category: AnalyticsCategory.REPOSITORY,
      action: AnalyticsAction.PACK_SUCCESS_CHARS,
      label,
      value: totalChars,
    });
  },

  trackPackError(repoUrl: string, error: string): void {
    trackEvent({
      category: AnalyticsCategory.REPOSITORY,
      action: AnalyticsAction.PACK_ERROR,
      label: `${normalizeRepoLabel(repoUrl)} - ${classifyError(error)}`,
    });
  },

  // Options events
  trackOptionToggle(action: AnalyticsActionType, enabled: boolean): void {
    trackEvent({
      category: AnalyticsCategory.OPTIONS,
      action: action,
      label: enabled ? 'enabled' : 'disabled',
    });
  },

  // Output events
  trackCopyOutput(format: string): void {
    trackEvent({
      category: AnalyticsCategory.OUTPUT,
      action: AnalyticsAction.COPY_OUTPUT,
      label: format,
    });
  },

  trackDownloadOutput(format: string): void {
    trackEvent({
      category: AnalyticsCategory.OUTPUT,
      action: AnalyticsAction.DOWNLOAD_OUTPUT,
      label: format,
    });
  },

  trackShareOutput(format: string): void {
    trackEvent({
      category: AnalyticsCategory.OUTPUT,
      action: AnalyticsAction.SHARE_OUTPUT,
      label: format,
    });
  },
};

// Type definitions for window.gtag
declare global {
  interface Window {
    gtag: (
      command: 'event',
      action: string,
      params: {
        event_category: string;
        event_label?: string;
        value?: number;
      },
    ) => void;
  }
}
