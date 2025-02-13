import type { PackOptions, PackRequest, PackResult } from '../api/client';
import { packRepository } from '../api/client';
import { type AnalyticsActionType, analyticsUtils } from './analytics';

interface RequestHandlerOptions {
  onSuccess?: (result: PackResult) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
  file?: File;
}

/**
 * Handle repository packing request
 */
export async function handlePackRequest(
  url: string,
  format: 'xml' | 'markdown' | 'plain',
  options: PackOptions,
  handlerOptions: RequestHandlerOptions = {},
): Promise<void> {
    
  const { onSuccess, onError, signal, file } = handlerOptions;
  const processedUrl = url.trim();

  // Track pack start
  analyticsUtils.trackPackStart(processedUrl);

  try {
    const request: PackRequest = {
      url: processedUrl,
      format,
      options,
      signal,
      file,
    };

    const response = await packRepository(request);

    // Track successful pack
    if (response.metadata.summary) {
      analyticsUtils.trackPackSuccess(
        processedUrl,
        response.metadata.summary.totalFiles,
        response.metadata.summary.totalCharacters,
      );
    }

    onSuccess?.(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';

    if (errorMessage === 'AbortError') {
      onError?.('Request was cancelled');
      return;
    }

    analyticsUtils.trackPackError(processedUrl, errorMessage);
    console.error('Error processing repository:', err);
    onError?.(errorMessage);
  }
}

/**
 * Handle form input changes with analytics tracking
 */
export function handleOptionChange(value: boolean | string, analyticsAction: AnalyticsActionType): void {
  if (typeof value === 'boolean') {
    analyticsUtils.trackOptionToggle(analyticsAction, value);
  } else {
    analyticsUtils.trackOptionToggle(analyticsAction, Boolean(value));
  }
}
