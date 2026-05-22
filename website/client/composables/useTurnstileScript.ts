// Cloudflare Turnstile script loader. Split from useTurnstile.ts to keep
// each file under the 250-line guideline (CLAUDE.md). The composable
// concerns itself with widget lifecycle, token requests, and abort
// propagation; this module only ensures the global script tag exists and
// resolves to `window.turnstile`.

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__repomixTurnstileOnload&render=explicit';
const SCRIPT_ID = 'repomix-turnstile-script';
const READY_CALLBACK = '__repomixTurnstileOnload';

export interface TurnstileGlobal {
  render: (el: HTMLElement, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

export interface TurnstileRenderOptions {
  sitekey: string;
  size?: 'normal' | 'compact' | 'flexible';
  // `action` is bound into the issued token and verified server-side, so a
  // token minted for /api/pack can't be replayed at a future endpoint that
  // expects a different action.
  action?: string;
  // 'render' (Cloudflare default) auto-runs the challenge on render(),
  // 'execute' waits for an explicit turnstile.execute() call. Use 'execute'
  // so the widget can be rendered without immediately minting a token.
  //
  // NOTE: production telemetry (PR #1539 → #1541) showed that even with
  // `execution: 'execute'` the dashboard still counts every render() call
  // toward "challenges issued / solved", contradicting the public docs. The
  // useTurnstile composable now defers render() to the first takeToken() /
  // preMintToken() call instead of pre-warming at form mount, which is the
  // only reliable way to keep the dashboard counters aligned with real
  // submissions.
  execution?: 'render' | 'execute';
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
export function loadTurnstileScript(): Promise<TurnstileGlobal> {
  if (scriptPromise) return scriptPromise;

  // Reset state on rejection so a transient CDN failure (ad blocker, network
  // blip) doesn't permanently lock the page out of Turnstile. Without this,
  // the rejected promise would be cached forever and every subsequent
  // takeToken() call would inherit the same stale rejection.
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
