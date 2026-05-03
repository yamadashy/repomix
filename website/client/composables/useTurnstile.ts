import { onBeforeUnmount, ref } from 'vue';

// Cloudflare Turnstile integration. Used by usePackRequest to obtain a 1-shot
// verification token that the server-side turnstileMiddleware verifies before
// running /api/pack.
//
// Site key resolution:
// - Build-time env var `VITE_TURNSTILE_SITE_KEY` overrides the default
//   (used for production / staging deploys via VitePress build env).
// - The fall-through is Cloudflare's "always-passes" test key
//   (`1x00000000000000000000AA`) so local dev and contributor builds work
//   without any setup. Using the test key in production would silently let all
//   tokens through — pair the deploy with the matching test secret on the
//   server, or set both to real values together.
const FALLBACK_TEST_SITE_KEY = '1x00000000000000000000AA';

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__repomixTurnstileOnload&render=explicit';
const SCRIPT_ID = 'repomix-turnstile-script';
const READY_CALLBACK = '__repomixTurnstileOnload';
// Upper bound on how long getToken() will wait for a callback. Cloudflare's
// `timeout-callback` only fires for interactive challenges, so an invisible
// widget that hangs (CDN stall, iframe never resolves) would otherwise leave
// the caller's promise pending forever and freeze the loading spinner.
const GET_TOKEN_TIMEOUT_MS = 15_000;

interface TurnstileGlobal {
  render: (el: HTMLElement, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
  getResponse: (widgetId: string) => string | undefined;
}

interface TurnstileRenderOptions {
  sitekey: string;
  size?: 'normal' | 'compact' | 'invisible';
  // `action` is bound into the issued token and verified server-side, so a
  // token minted for /api/pack can't be replayed at a future endpoint that
  // expects a different action.
  action?: string;
  callback?: (token: string) => void;
  'error-callback'?: (errorCode: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
    __repomixTurnstileOnload?: () => void;
  }
}

let scriptPromise: Promise<TurnstileGlobal> | null = null;

// Load the Turnstile script exactly once per page. Multiple components can
// share the same script tag and the same `window.turnstile` instance.
function loadTurnstileScript(): Promise<TurnstileGlobal> {
  if (scriptPromise) return scriptPromise;

  // Reset state on rejection so a transient CDN failure (ad blocker, network
  // blip) doesn't permanently lock the page out of Turnstile. Without this,
  // the rejected promise would be cached forever and every subsequent
  // getToken() call would inherit the same stale rejection.
  //
  // Belt-and-suspenders: also drop the global onload callback so a late-
  // arriving script load (e.g. extension interference resolving after
  // onerror) can't reach into a stale closure and resolve a long-gone
  // promise.
  const resetForRetry = () => {
    scriptPromise = null;
    document.getElementById(SCRIPT_ID)?.remove();
    delete window[READY_CALLBACK];
  };

  scriptPromise = new Promise<TurnstileGlobal>((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    window[READY_CALLBACK] = () => {
      // Drop the global once it has fired. Keeps the success path symmetric
      // with the retry path (which also deletes via resetForRetry) and avoids
      // leaving a stale function on `window` that could be invoked again if
      // the script tag is re-injected by some other code on the page.
      delete window[READY_CALLBACK];
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        resetForRetry();
        reject(new Error('Turnstile script loaded but window.turnstile is missing'));
      }
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        resetForRetry();
        reject(new Error('Failed to load Turnstile script'));
      };
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

export function useTurnstile() {
  const widgetId = ref<string | null>(null);
  const containerEl = ref<HTMLElement | null>(null);
  const error = ref<string | null>(null);

  // Resolved when the next render of the widget produces a token. Reassigned
  // on each `getToken()` call so back-to-back submits don't share state.
  let pendingResolve: ((token: string) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;
  // Monotonic generation counter. Each getToken() call captures a local copy
  // and the timeout/callback closures verify it before mutating shared state.
  // This neutralises three otherwise-leaky scenarios:
  //  - a stale timeout from a previous call clearing the next call's pending
  //    handlers,
  //  - a delayed widget callback resolving the next call with a stale token,
  //  - a back-to-back submit reusing handlers before the previous timeout
  //    has fired.
  let currentGen = 0;

  // Site key resolution. The production-only safety net lives in
  // `.vitepress/config.ts` (it throws at build time when the Cloudflare Pages
  // production deploy is missing VITE_TURNSTILE_SITE_KEY). We deliberately do
  // *not* duplicate that check here with `import.meta.env.PROD`, because PROD
  // is true for all `vitepress build` outputs — CF Pages preview deploys,
  // local `docs:build`, and CI builds all set PROD=true and are documented to
  // fall through to the test sitekey. Adding a runtime throw scoped to PROD
  // would crash the form in those non-production environments.
  //
  // Defense in depth: the server-side middleware fail-closes when it has a
  // real TURNSTILE_SECRET_KEY but receives a token issued by the test
  // sitekey (action/hostname mismatch), so an actual production deploy that
  // somehow shipped the test sitekey would still 403 every pack.
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? FALLBACK_TEST_SITE_KEY;

  async function ensureWidget(el: HTMLElement): Promise<TurnstileGlobal> {
    const turnstile = await loadTurnstileScript();
    // The component may have unmounted (or the user may have switched away
    // from the form) while the script was loading. Detached DOM elements
    // accept render() but the corresponding remove() in onBeforeUnmount has
    // already run, so the widget would leak. Bail out instead.
    if (containerEl.value !== el) {
      throw new Error('Turnstile container detached during script load');
    }
    if (!widgetId.value) {
      widgetId.value = turnstile.render(el, {
        sitekey: siteKey,
        size: 'invisible',
        action: 'pack',
        callback: (token: string) => {
          if (pendingResolve) {
            pendingResolve(token);
            pendingResolve = null;
            pendingReject = null;
          }
        },
        'error-callback': (errorCode: string) => {
          const message = `Turnstile error: ${errorCode}`;
          error.value = message;
          if (pendingReject) {
            pendingReject(new Error(message));
            pendingResolve = null;
            pendingReject = null;
          }
        },
        'expired-callback': () => {
          // Token expired before being used. The widget will issue a fresh
          // one on the next execute() call.
          if (widgetId.value) turnstile.reset(widgetId.value);
        },
        'timeout-callback': () => {
          if (pendingReject) {
            pendingReject(new Error('Turnstile challenge timed out'));
            pendingResolve = null;
            pendingReject = null;
          }
        },
      });
    }
    return turnstile;
  }

  // Ask the (invisible) widget for a fresh verification token. Each call
  // resets the widget first because Turnstile tokens are 1-shot.
  //
  // The optional `signal` lets the caller (usePackRequest's submit flow)
  // abort the challenge mid-flight when the user cancels — without it, a
  // hung Turnstile iframe would block the cancel response for up to
  // GET_TOKEN_TIMEOUT_MS even though the surrounding pack request was
  // already aborted.
  async function getToken(signal?: AbortSignal): Promise<string> {
    error.value = null;
    const checkAborted = () => {
      if (signal?.aborted) throw new Error('Turnstile challenge aborted');
    };
    checkAborted();
    if (!containerEl.value) {
      throw new Error('Turnstile container element not registered');
    }
    // Race the script-load step against the caller's abort signal so a
    // user-initiated cancel during a slow script load (CDN stall, ad
    // blocker, network blip) doesn't have to wait for the surrounding 30s
    // pack timeout. The signal is also re-checked before listener setup
    // below to cover the race where the abort fired during the await.
    const widgetPromise = ensureWidget(containerEl.value);
    const turnstile = signal
      ? await Promise.race([
          widgetPromise,
          new Promise<never>((_, reject) => {
            const onPreAbort = () => reject(new Error('Turnstile challenge aborted'));
            if (signal.aborted) onPreAbort();
            else signal.addEventListener('abort', onPreAbort, { once: true });
          }),
        ])
      : await widgetPromise;
    checkAborted();
    if (!widgetId.value) {
      throw new Error('Turnstile widget failed to render');
    }

    // Supersede any in-flight request: reject the previous caller before we
    // overwrite pendingResolve/pendingReject below.
    if (pendingReject) {
      pendingReject(new Error('Superseded by new Turnstile request'));
      pendingResolve = null;
      pendingReject = null;
    }

    const myGen = ++currentGen;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;

    const tokenPromise = new Promise<string>((resolve, reject) => {
      // Wrap in gen-checked closures so a delayed widget callback can't
      // resolve a later request with a stale token, and the timeout below
      // clears handlers only if no fresher request has taken over.
      pendingResolve = (token) => {
        if (myGen !== currentGen) return;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        if (onAbort && signal) signal.removeEventListener('abort', onAbort);
        pendingResolve = null;
        pendingReject = null;
        resolve(token);
      };
      pendingReject = (err) => {
        if (myGen !== currentGen) return;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        if (onAbort && signal) signal.removeEventListener('abort', onAbort);
        pendingResolve = null;
        pendingReject = null;
        reject(err);
      };
      // The widget retains its previous token until reset(); explicit reset
      // forces a new challenge on every getToken() call.
      if (widgetId.value) turnstile.reset(widgetId.value);
      if (widgetId.value) turnstile.execute(widgetId.value);
    });

    if (signal) {
      onAbort = () => {
        if (pendingReject) pendingReject(new Error('Turnstile challenge aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    // Bounded race against a hung widget. The gen check ensures a stale timer
    // from a previous call (whose tokenPromise already resolved) cannot clear
    // the current request's handlers.
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (myGen !== currentGen) return;
        if (onAbort && signal) signal.removeEventListener('abort', onAbort);
        pendingResolve = null;
        pendingReject = null;
        reject(new Error('Turnstile challenge timed out'));
      }, GET_TOKEN_TIMEOUT_MS);
    });
    return Promise.race([tokenPromise, timeoutPromise]);
  }

  function setContainer(el: HTMLElement | null) {
    containerEl.value = el;
  }

  onBeforeUnmount(() => {
    // Reject any in-flight getToken() promise so the awaiting caller doesn't
    // hang forever after the form unmounts (e.g. user navigates away mid-
    // challenge).
    if (pendingReject) {
      pendingReject(new Error('Turnstile widget unmounted'));
      pendingResolve = null;
      pendingReject = null;
    }
    if (widgetId.value && window.turnstile) {
      window.turnstile.remove(widgetId.value);
      widgetId.value = null;
    }
  });

  return {
    setContainer,
    getToken,
    error,
  };
}
