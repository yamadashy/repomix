import { computed, onMounted, ref } from 'vue';
import type { FileInfo, PackProgressStage, PackResult } from '../components/api/client';
import { handlePackRequest } from '../components/utils/requestHandlers';
import { isValidRemoteValue } from '../components/utils/validation';
import { parseUrlParameters } from '../utils/urlParams';
import { usePackOptions } from './usePackOptions';
import { useTurnstile } from './useTurnstile';

export type InputMode = 'url' | 'file' | 'folder';

export function usePackRequest() {
  const packOptionsComposable = usePackOptions();
  const { packOptions, getPackRequestOptions, resetOptions, applyUrlParameters, DEFAULT_PACK_OPTIONS } =
    packOptionsComposable;

  const turnstile = useTurnstile();

  // Input states
  const inputUrl = ref('');
  const inputRepositoryUrl = ref('');
  const mode = ref<InputMode>('url');
  const uploadedFile = ref<File | null>(null);

  // Request states
  const loading = ref(false);
  const error = ref<string | null>(null);
  const errorType = ref<'error' | 'warning'>('error');
  const result = ref<PackResult | null>(null);
  const hasExecuted = ref(false);
  const progressStage = ref<PackProgressStage | null>(null);
  const progressMessage = ref<string | null>(null);

  // Request controller for cancellation
  let requestController: AbortController | null = null;
  const TIMEOUT_MS = 30_000;

  // Computed validation
  const isSubmitValid = computed(() => {
    switch (mode.value) {
      case 'url':
        return !!inputUrl.value && isValidRemoteValue(inputUrl.value.trim());
      case 'file':
      case 'folder':
        return !!uploadedFile.value;
      default:
        return false;
    }
  });

  function setMode(newMode: InputMode) {
    mode.value = newMode;
  }

  function handleFileUpload(file: File) {
    uploadedFile.value = file;
  }

  function resetRequest() {
    error.value = null;
    errorType.value = 'error';
    result.value = null;
    hasExecuted.value = false;
  }

  async function submitRequest() {
    if (!isSubmitValid.value) return;

    // Cancel any pending request
    if (requestController) {
      requestController.abort();
    }
    requestController = new AbortController();
    // Capture the controller in a local const before any await. cancelRequest()
    // can null out the shared `requestController` while we're awaiting
    // turnstile.getToken(); reading `requestController.signal` after that
    // would throw TypeError. The local reference still points to the original
    // (already-aborted) controller, so the downstream signal check in
    // handlePackRequest still works correctly.
    const controller = requestController;

    loading.value = true;
    error.value = null;
    errorType.value = 'error';
    result.value = null;
    hasExecuted.value = true;
    progressStage.value = null;
    progressMessage.value = null;
    inputRepositoryUrl.value = inputUrl.value;

    // Set up automatic timeout
    // Use .bind() to avoid capturing the surrounding scope in the closure
    const timeoutId = setTimeout(controller.abort.bind(controller, 'timeout'), TIMEOUT_MS);

    // Obtain a 1-shot Turnstile token before issuing the pack request. If the
    // widget fails (e.g. script blocked by an ad blocker, network error) the
    // policy is environment-specific:
    // - In production: surface a user-facing error and skip the request.
    //   The server-side middleware would 403 anyway, so calling /api/pack
    //   without a token only wastes a server round-trip.
    // - In dev/preview: continue without a token. The server skips
    //   verification when TURNSTILE_SECRET_KEY is unset, so contributors
    //   without a Cloudflare account can still exercise the pack flow.
    // All UI mutations from this point forward are guarded by `isCurrent()`.
    // Without the guard, a slow request whose user hit cancel-and-resubmit
    // could clobber the new request's `loading` / `result` / `error` state
    // mid-flight (e.g. an old onAbort firing "Request was cancelled" while a
    // fresh pack is still loading). Anchoring to the local AbortController
    // identity is the cleanest way to detect supersession.
    const isCurrent = () => requestController === controller;

    let turnstileToken: string | undefined;
    try {
      // Pass the controller signal so cancelling the pack request also
      // aborts an in-flight Turnstile challenge — otherwise a hung widget
      // would delay the cancel response by up to 15s.
      turnstileToken = await turnstile.getToken(controller.signal);
    } catch (turnstileError) {
      console.warn('Turnstile token acquisition failed:', turnstileError);
      if (controller.signal.aborted) {
        // The user (or the 30s timeout) cancelled while the challenge was
        // in flight. Mirror handlePackRequest's onAbort messaging since we
        // short-circuit before calling it.
        clearTimeout(timeoutId);
        if (isCurrent()) {
          loading.value = false;
          requestController = null;
          if (controller.signal.reason === 'timeout') {
            error.value =
              'Request timed out.\nPlease consider using Include Patterns or Ignore Patterns to reduce the scope.';
          } else {
            error.value = 'Request was cancelled.';
          }
          errorType.value = 'warning';
        }
        return;
      }
      if (import.meta.env.PROD) {
        clearTimeout(timeoutId);
        if (isCurrent()) {
          loading.value = false;
          requestController = null;
          // Distinguish "Turnstile script blocked" (likely an extension) from
          // generic verification failure so the user has a path to recovery
          // instead of just being told "try again".
          const msg = turnstileError instanceof Error ? turnstileError.message : '';
          const isScriptIssue = /script|load|missing/i.test(msg);
          error.value = isScriptIssue
            ? 'Bot protection failed to load. Please disable ad blockers or privacy extensions blocking challenges.cloudflare.com and reload.'
            : 'Verification failed. Please reload the page and try again.';
          errorType.value = 'error';
        }
        return;
      }
    }

    try {
      await handlePackRequest(
        mode.value === 'url' ? inputUrl.value : '',
        packOptions.format,
        getPackRequestOptions.value,
        {
          onSuccess: (response) => {
            if (!isCurrent()) return;
            result.value = response;
          },
          onError: (errorMessage) => {
            if (!isCurrent()) return;
            error.value = errorMessage;
          },
          onAbort: (message) => {
            if (!isCurrent()) return;
            error.value = message;
            errorType.value = 'warning';
          },
          onProgress: (stage, message) => {
            if (!isCurrent()) return;
            progressStage.value = stage;
            progressMessage.value = message ?? null;
          },
          signal: controller.signal,
          file: mode.value === 'file' || mode.value === 'folder' ? uploadedFile.value || undefined : undefined,
          turnstileToken,
        },
      );
    } finally {
      clearTimeout(timeoutId);
      // Only reset shared state if no newer submitRequest() has taken over the
      // slot. Without this guard, a slow finally from a cancelled (or
      // superseded) request would clobber a fresh in-flight request: setting
      // loading=false hides the spinner, and nulling requestController breaks
      // a subsequent cancelRequest() call.
      if (requestController === controller) {
        loading.value = false;
        requestController = null;
      }
    }
  }

  async function repackWithSelectedFiles(selectedFiles: FileInfo[]) {
    if (!result.value || selectedFiles.length === 0) return;

    // Generate include patterns from selected files
    const selectedPaths = selectedFiles.map((file) => file.path);
    const includePatterns = selectedPaths.join(',');

    // Temporarily update pack options with include patterns
    const originalIncludePatterns = packOptions.includePatterns;
    const originalIgnorePatterns = packOptions.ignorePatterns;

    packOptions.includePatterns = includePatterns;
    packOptions.ignorePatterns = ''; // Clear ignore patterns to ensure selected files are included

    try {
      // Use the same loading state as normal pack processing
      await submitRequest();

      // Update file selection state in the new result
      if (result.value?.metadata?.allFiles) {
        for (const file of result.value.metadata.allFiles) {
          file.selected = selectedPaths.includes(file.path);
        }
      }
    } finally {
      // Restore original pack options
      packOptions.includePatterns = originalIncludePatterns;
      packOptions.ignorePatterns = originalIgnorePatterns;
    }
  }

  function cancelRequest() {
    if (requestController) {
      requestController.abort('cancel');
      // The downstream onAbort callback would normally surface the
      // "Request was cancelled" warning, but since we're about to null
      // requestController the isCurrent() guard inside onAbort treats it
      // as stale and skips the message. Set it here directly so the user
      // gets immediate feedback.
      error.value = 'Request was cancelled.';
      errorType.value = 'warning';
      requestController = null;
    }
    loading.value = false;
  }

  // Apply URL parameters after component mounts
  // This must be done here (not during setup) because during SSR/hydration,
  // browser globals like `window.location.search` are not available.
  // Accessing them before mounting would cause errors in SSR environments.
  onMounted(() => {
    const urlParams = parseUrlParameters();

    // Apply pack options from URL parameters
    applyUrlParameters(urlParams);

    // Apply repo URL from URL parameters
    if (urlParams.repo) {
      inputUrl.value = urlParams.repo;
    }
  });

  return {
    // Pack options (re-exported for convenience)
    ...packOptionsComposable,

    // Input states
    inputUrl,
    inputRepositoryUrl,
    mode,
    uploadedFile,

    // Request states
    loading,
    error,
    errorType,
    result,
    hasExecuted,
    progressStage,
    progressMessage,

    // Computed
    isSubmitValid,

    // Actions
    setMode,
    handleFileUpload,
    resetRequest,
    submitRequest,
    repackWithSelectedFiles,
    cancelRequest,

    // Turnstile widget container (Vue ref callback consumer)
    setTurnstileContainer: turnstile.setContainer,

    // Pack option actions
    resetOptions,
    DEFAULT_PACK_OPTIONS,
  };
}
