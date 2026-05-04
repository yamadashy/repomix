import { onBeforeUnmount, ref } from 'vue';
import { loadTurnstileScript, type TurnstileGlobal } from './useTurnstileScript';

// Cloudflare Turnstile integration. Used by usePackRequest to obtain a 1-shot
// verification token that the server-side turnstileMiddleware verifies before
// running /api/pack.
//
// The script-loading mechanics (script tag injection, READY_CALLBACK,
// retry-on-failure) live in `useTurnstileScript.ts` so this file stays
// focused on widget lifecycle / token requests / abort propagation.
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

// Upper bound on how long getToken() will wait for a callback. Cloudflare's
// `timeout-callback` only fires for interactive challenges, so an invisible
// widget that hangs (CDN stall, iframe never resolves) would otherwise leave
// the caller's promise pending forever and freeze the loading spinner.
const GET_TOKEN_TIMEOUT_MS = 15_000;

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
