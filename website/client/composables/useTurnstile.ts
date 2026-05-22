import { onBeforeUnmount, ref } from 'vue';
import { loadTurnstileScript, type TurnstileGlobal } from './useTurnstileScript';
import { createTurnstileTokenCache } from './useTurnstileTokenCache';

// Cloudflare Turnstile integration. Used by usePackRequest to obtain a 1-shot
// verification token that the server-side turnstileMiddleware verifies before
// running /api/pack.
//
// Layering:
// - `useTurnstileScript.ts` — script tag injection / READY_CALLBACK / retry.
// - `useTurnstileTokenCache.ts` — token cache, single-flight mint,
//   atomic one-shot consumption.
// - this file — widget lifecycle (render/execute/reset), abort propagation
//   into the underlying iframe, supersede / generation-counter logic.
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

// Upper bound on how long the widget callback can take. Cloudflare's
// `timeout-callback` only fires for interactive challenges, so an invisible
// widget that hangs (CDN stall, iframe never resolves) would otherwise leave
// the caller's promise pending forever and freeze the loading spinner.
const MINT_TIMEOUT_MS = 15_000;

export function useTurnstile() {
  const widgetId = ref<string | null>(null);
  const containerEl = ref<HTMLElement | null>(null);

  // Resolved when the next widget callback produces a token. Reassigned on
  // every mint so back-to-back submits don't share state.
  let pendingResolve: ((token: string) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;
  // Monotonic generation counter. Each mintToken() call captures a local
  // copy and the timeout/callback closures verify it before mutating shared
  // state. This neutralises three otherwise-leaky scenarios:
  //  - a stale timeout from a previous mint clearing the next call's pending
  //    handlers,
  //  - a delayed widget callback resolving a later request with a stale
  //    token,
  //  - back-to-back mints reusing handlers before the previous timeout has
  //    fired.
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

  // Single-flight cache for the in-flight ensureWidget promise. Shared by
  // every code path that needs the widget (preMintToken, click-time mint),
  // so concurrent calls can't both pass the `widgetId.value` null check
  // after `await loadTurnstileScript()` resolves and call `turnstile.render()`
  // twice — the first widget id would be overwritten and leak.
  let ensureWidgetPromise: Promise<TurnstileGlobal> | null = null;

  // Forward declaration — set after cache is created below.
  let resetCache: () => void = () => {};

  async function ensureWidget(el: HTMLElement): Promise<TurnstileGlobal> {
    if (ensureWidgetPromise) return ensureWidgetPromise;
    ensureWidgetPromise = (async () => {
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
          action: 'pack',
          execution: 'execute',
          callback: (token: string) => {
            if (pendingResolve) {
              pendingResolve(token);
              pendingResolve = null;
              pendingReject = null;
            }
          },
          'error-callback': (errorCode: string) => {
            if (pendingReject) {
              pendingReject(new Error(`Turnstile error: ${errorCode}`));
              pendingResolve = null;
              pendingReject = null;
            }
          },
          'expired-callback': () => {
            // Token expired before being used. Drop the cache so the next
            // takeToken() refreshes; the widget will issue a fresh token on
            // the next execute() call.
            //
            // Intentionally do NOT auto-rearm pre-mint here. A user who
            // fills the form and then leaves the tab idle would otherwise
            // burn a challenge every TOKEN_TTL_MS (~4 minutes) for the
            // entire lifetime of the page, re-creating dashboard counter
            // inflation. The trade-off is that an idle-then-return user
            // pays the cold mint latency on their next click; for a tab
            // left open for hours, that's the right call.
            resetCache();
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
    })();
    try {
      return await ensureWidgetPromise;
    } catch (err) {
      // Drop the cached promise on rejection so a retry (e.g. after a CDN
      // blip cleared by useTurnstileScript's resetForRetry) can re-enter the
      // render path. On success we keep the resolved promise cached: the
      // widgetId guard above turns subsequent calls into a no-op anyway, but
      // returning the same promise avoids a duplicate `loadTurnstileScript()`
      // round-trip in the cached-success case.
      ensureWidgetPromise = null;
      throw err;
    }
  }

  // Run the widget challenge and return a fresh token. Internal primitive
  // wrapped by the token cache's preMintToken / takeToken.
  async function mintToken(): Promise<string> {
    if (!containerEl.value) {
      throw new Error('Turnstile container element not registered');
    }
    const turnstile = await ensureWidget(containerEl.value);
    const renderedWidgetId = widgetId.value;
    if (!renderedWidgetId) {
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

    const tokenPromise = new Promise<string>((resolve, reject) => {
      // Wrap in gen-checked closures so a delayed widget callback can't
      // resolve a later request with a stale token, and the timeout below
      // clears handlers only if no fresher request has taken over.
      pendingResolve = (token) => {
        if (myGen !== currentGen) return;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        pendingResolve = null;
        pendingReject = null;
        resolve(token);
      };
      pendingReject = (err) => {
        if (myGen !== currentGen) return;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        pendingResolve = null;
        pendingReject = null;
        reject(err);
      };
      // Tokens are 1-shot, so reset() before each execute() to clear any
      // stale challenge state inside the widget itself.
      turnstile.reset(renderedWidgetId);
      turnstile.execute(renderedWidgetId);
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (myGen !== currentGen) return;
        pendingResolve = null;
        pendingReject = null;
        reject(new Error('Turnstile challenge timed out'));
      }, MINT_TIMEOUT_MS);
    });
    return Promise.race([tokenPromise, timeoutPromise]);
  }

  const cache = createTurnstileTokenCache(mintToken);
  resetCache = cache.reset;

  function setContainer(el: HTMLElement | null) {
    containerEl.value = el;
    // Intentionally do NOT pre-warm the script here. Production telemetry
    // (PR #1541 follow-up) showed that simply loading api.js inflates the
    // Cloudflare dashboard's "challenge issued" counter to roughly the
    // page-view count, regardless of whether `render()` is ever called.
    // Pre-warm now happens only when usePackRequest sees a real intent
    // signal (valid input + user interaction), which gates both the script
    // load and the challenge to visitors who actually plan to submit.
  }

  onBeforeUnmount(() => {
    // Drop the container ref first so any in-flight pre-warm `ensureWidget()`
    // call that resolves AFTER unmount sees `containerEl.value !== el` and
    // skips render(). Without this, a slow script load could complete after
    // the form was unmounted and bind a new widget to a detached DOM node
    // with no remove() left to clean it up.
    containerEl.value = null;
    // Reject any in-flight mint so the awaiting caller doesn't hang forever
    // after the form unmounts (e.g. user navigates away mid-challenge).
    if (pendingReject) {
      pendingReject(new Error('Turnstile widget unmounted'));
      pendingResolve = null;
      pendingReject = null;
    }
    cache.reset();
    if (widgetId.value && window.turnstile) {
      window.turnstile.remove(widgetId.value);
      widgetId.value = null;
    }
  });

  return {
    setContainer,
    preMintToken: cache.preMintToken,
    takeToken: cache.takeToken,
  };
}
