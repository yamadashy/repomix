import { computed, onMounted, ref } from 'vue';
import type { DisplayProgressStage, FileInfo, PackResult } from '../components/api/client';
import { handlePackRequest } from '../components/utils/requestHandlers';
import { isValidRemoteValue } from '../components/utils/validation';
import { isBot } from '../utils/botDetect';
import { parseUrlParameters } from '../utils/urlParams';
import { abortMessage, acquireTurnstileToken } from './turnstileSubmit';
import { usePackOptions } from './usePackOptions';
import { usePreMintDebounce } from './usePreMintDebounce';
import { useTurnstile } from './useTurnstile';

// Delay between the user's last interaction and when we kick off the
// background Turnstile pre-mint. Tuned for the typical paste-then-click
// cadence: long enough that single-keystroke typing doesn't burn a token,
// short enough that a paste-and-click within a normal reaction window
// (~500ms+) usually finds a ready token in the cache.
const PRE_MINT_DEBOUNCE_MS = 300;

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
  // True once the user has signalled real intent: typed/pasted a URL,
  // uploaded a file/folder, switched modes, or tweaked options. Used to
  // gate the Turnstile pre-mint so URL-parameter hydration (`?repo=...`)
  // and form restoration don't trigger background challenges. Set-only —
  // once true, it stays true for the session.
  //
  // Caveat: modern Chromium / Firefox DO fire `input` events on browser
  // autofill, which would flip this flag through TryItUrlInput's handler
  // and trigger a wasted pre-mint for JS-executing crawlers that have
  // autofill-like behaviour. The `isBot()` check at the pre-mint trigger
  // sites covers that gap for well-behaved crawler UAs; sophisticated
  // bots that spoof UA still get filtered server-side by siteverify.
  const userTouched = ref(false);

  // Request states
  const loading = ref(false);
  const error = ref<string | null>(null);
  const errorType = ref<'error' | 'warning'>('error');
  const result = ref<PackResult | null>(null);
  const hasExecuted = ref(false);
  const progressStage = ref<DisplayProgressStage | null>(null);
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
    // Mode tab clicks are unambiguous user interactions, so they're a safe
    // intent signal even before any input has been entered.
    userTouched.value = true;
  }

  function handleFileUpload(file: File) {
    uploadedFile.value = file;
    userTouched.value = true;
  }

  // Wired to DOM-level input events (paste / IME / drop / typing) by
  // TryItUrlInput, and to TryItPackOptions option-change handlers.
  // Watching `inputUrl` / `packOptions` directly would also fire on URL-
  // parameter hydration in onMounted(), which we want to opt into
  // explicitly (see `?repo=` handling in onMounted) rather than implicitly.
  function markUserTouched() {
    userTouched.value = true;
  }

  const preMint = usePreMintDebounce({
    isSubmitValid,
    userTouched,
    loading,
    onTrigger: () => {
      // Skip background pre-mint for known crawlers. These visitors can't
      // solve the Turnstile challenge anyway (the JS challenge requires
      // real browser fingerprints), so issuing one only inflates the CF
      // dashboard "提示チャレンジ" (issued challenges) / "未解決"
      // (unsolved) counters without producing a usable token. The actual
      // security gate is the server-side siteverify in
      // turnstileMiddleware — that stays unchanged, so a crawler that
      // spoofs UA past `isBot()` still gets blocked there. The click-path
      // `acquireTurnstileToken()` (cold-mint at submit time) is
      // intentionally NOT gated to avoid false-positive lockouts of legit
      // users with unusual UAs; only the warm-up paths short-circuit here
      // and at the post-submit re-mint below.
      if (isBot()) return;
      turnstile.preMintToken().catch(() => {
        /* errors surface on the actual submit path */
      });
    },
    delayMs: PRE_MINT_DEBOUNCE_MS,
  });

  function resetRequest() {
    error.value = null;
    errorType.value = 'error';
    result.value = null;
    hasExecuted.value = false;
  }

  async function submitRequest() {
    if (!isSubmitValid.value) return;

    // Drop any pending pre-mint debounce. Without an explicit clear here a
    // debounce that's about to fire *this microtask* could still mint an
    // extra token alongside the click path's mint.
    preMint.clear();

    // Cancel any pending request
    if (requestController) {
      requestController.abort();
    }
    requestController = new AbortController();
    // Capture the controller in a local const before any await. cancelRequest()
    // can null out the shared `requestController` while we're awaiting
    // turnstile.takeToken(); reading `requestController.signal` after that
    // would throw TypeError. The local reference still points to the original
    // (already-aborted) controller, so the downstream signal check in
    // handlePackRequest still works correctly.
    const controller = requestController;

    loading.value = true;
    error.value = null;
    errorType.value = 'error';
    result.value = null;
    hasExecuted.value = true;
    // Show a meaningful loading step while the server runs Turnstile
    // siteverify (typically 100-1000ms before the first SSE 'cache-check'
    // event arrives). The first onProgress callback from handlePackRequest
    // overwrites this with the real server-reported stage.
    progressStage.value = 'verifying';
    progressMessage.value = null;
    inputRepositoryUrl.value = inputUrl.value;

    // Set up automatic timeout
    // Use .bind() to avoid capturing the surrounding scope in the closure
    const timeoutId = setTimeout(controller.abort.bind(controller, 'timeout'), TIMEOUT_MS);

    // All UI mutations from this point forward are guarded by `isCurrent()`.
    // Without the guard, a slow request whose user hit cancel-and-resubmit
    // could clobber the new request's `loading` / `result` / `error` state
    // mid-flight (e.g. an old onAbort firing "Request was cancelled" while a
    // fresh pack is still loading). Anchoring to the local AbortController
    // identity is the cleanest way to detect supersession.
    const isCurrent = () => requestController === controller;

    // Obtain a 1-shot Turnstile token before issuing the pack request. The
    // controller signal aborts an in-flight challenge when the pack request
    // is cancelled, so a hung widget can't delay the cancel response.
    const tokenResult = await acquireTurnstileToken(turnstile, controller.signal);
    if (tokenResult.kind === 'aborted') {
      clearTimeout(timeoutId);
      if (isCurrent()) {
        loading.value = false;
        requestController = null;
        // Clear progressStage and progressMessage so a subsequent submit's
        // brief verifying window doesn't pick up the previous run's stale
        // state. Mirrors the initialization at the top of submitRequest.
        progressStage.value = null;
        progressMessage.value = null;
        error.value = abortMessage(tokenResult.reason);
        errorType.value = 'warning';
      }
      return;
    }
    if (tokenResult.kind === 'error') {
      clearTimeout(timeoutId);
      if (isCurrent()) {
        loading.value = false;
        requestController = null;
        progressStage.value = null;
        progressMessage.value = null;
        error.value = tokenResult.message;
        errorType.value = 'error';
      }
      return;
    }
    const turnstileToken = tokenResult.token;

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
        // Repeat-pack convenience: warm the cache for a likely follow-up
        // submission (option tweak + repack, or `repackWithSelectedFiles`
        // triggered from the result view). Skipped on abort/cancel since
        // the user may have given up, on invalid form (user may have
        // cleared the URL mid-request), and on bot-shaped UAs (same
        // rationale as the debounce gate above — avoid burning a CF
        // challenge that can't be solved). userTouched is necessarily true
        // here — it was a precondition for isSubmitValid to be true at
        // submit start. Failures swallow silently — they surface on the
        // next click via takeToken's cold path.
        if (!controller.signal.aborted && isSubmitValid.value && !isBot()) {
          turnstile.preMintToken().catch(() => {});
        }
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

    // Apply repo URL from URL parameters. Intentionally do NOT flip
    // `userTouched` here even when the value is valid: third-party pages
    // driving traffic to `https://repomix.com/?repo=<...>` would otherwise
    // amplify dashboard counters via link unfurlers (Slack / Discord /
    // Twitter card validators that execute JS) — re-creating the
    // page-view-shaped inflation this PR is meant to fix. Permalink
    // visitors still pay the cold mint on click; the user's first real
    // form interaction (typing, mode click, option tweak, file upload)
    // is what gates the pre-mint.
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
    markUserTouched,

    // Turnstile widget container (Vue ref callback consumer)
    setTurnstileContainer: turnstile.setContainer,

    // Pack option actions
    resetOptions,
    DEFAULT_PACK_OPTIONS,
  };
}
