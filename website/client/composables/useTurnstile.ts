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

  scriptPromise = new Promise<TurnstileGlobal>((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    window[READY_CALLBACK] = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
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
      script.onerror = () => reject(new Error('Failed to load Turnstile script'));
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

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? FALLBACK_TEST_SITE_KEY;

  async function ensureWidget(el: HTMLElement): Promise<TurnstileGlobal> {
    const turnstile = await loadTurnstileScript();
    if (!widgetId.value) {
      widgetId.value = turnstile.render(el, {
        sitekey: siteKey,
        size: 'invisible',
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
  async function getToken(): Promise<string> {
    error.value = null;
    if (!containerEl.value) {
      throw new Error('Turnstile container element not registered');
    }
    const turnstile = await ensureWidget(containerEl.value);
    if (!widgetId.value) {
      throw new Error('Turnstile widget failed to render');
    }

    return new Promise<string>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      // The widget retains its previous token until reset(); explicit reset
      // forces a new challenge on every getToken() call.
      if (widgetId.value) turnstile.reset(widgetId.value);
      if (widgetId.value) turnstile.execute(widgetId.value);
    });
  }

  function setContainer(el: HTMLElement | null) {
    containerEl.value = el;
  }

  onBeforeUnmount(() => {
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
