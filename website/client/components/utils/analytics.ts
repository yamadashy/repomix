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
      label: repoUrl,
    });
  },

  trackPackSuccess(repoUrl: string, totalFiles: number, totalChars: number): void {
    trackEvent({
      category: AnalyticsCategory.REPOSITORY,
      action: AnalyticsAction.PACK_SUCCESS_FILES,
      label: `${repoUrl}_files`,
      value: totalFiles,
    });
    trackEvent({
      category: AnalyticsCategory.REPOSITORY,
      action: AnalyticsAction.PACK_SUCCESS_CHARS,
      label: `${repoUrl}_chars`,
      value: totalChars,
    });
  },

  trackPackError(repoUrl: string, error: string): void {
    trackEvent({
      category: AnalyticsCategory.REPOSITORY,
      action: AnalyticsAction.PACK_ERROR,
      label: `${repoUrl} - ${error}`,
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
