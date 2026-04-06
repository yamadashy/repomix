import type { PackOptions, PackProgressStage, PackRequest, PackResult } from '../api/client';
import { packRepository } from '../api/client';
import { type AnalyticsActionType, analyticsUtils } from './analytics';

interface RequestHandlerOptions {
  onSuccess?: (result: PackResult) => void;
  onError?: (error: string) => void;
  onAbort?: (message: string) => void;
  onProgress?: (stage: PackProgressStage) => void;
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
  const { onSuccess, onError, onAbort, onProgress, signal, file } = handlerOptions;
  const processedUrl = url.trim();

  // Track pack start
  analyticsUtils.trackPackStart(processedUrl);

  try {
    const request: PackRequest = {
      url: processedUrl,
      format,
      options,
      file,
    };

    const response = await packRepository(request, {
      onProgress,
      signal,
    });

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
    // Check for abort/timeout first, regardless of error type
    if (signal?.aborted) {
      const isTimeout = signal?.reason === 'timeout';
      if (isTimeout) {
        onAbort?.('Request timed out.\nPlease consider using Include Patterns or Ignore Patterns to reduce the scope.');
        return;
      }

      const isCancelled = signal?.reason === 'cancel';
      if (isCancelled) {
        onAbort?.('Request was cancelled.');
        return;
      }

      onAbort?.('Request was cancelled with an unknown reason.');
      return;
    }

    let errorMessage: string;

    if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = 'An unexpected error occurred';
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
