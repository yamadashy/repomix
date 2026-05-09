import { isbot } from 'isbot';

// Cache the `isbot()` result keyed by the UA string itself. In a browser
// `navigator.userAgent` is immutable for the page lifetime so this acts
// as a per-session memo, avoiding a non-trivial regex match on every
// Turnstile pre-mint debounce / post-submit re-mint check. In any Node
// context where the same module instance might be reused across requests
// (VitePress SSG, dev server, preview server with `navigator` polyfilled)
// the UA-keyed cache invalidates automatically when a different UA shows
// up, so a long-lived process can't hand a stale answer to the next
// caller. The SSR fallback (`navigator === undefined`) intentionally
// returns false without caching, since absence of UA isn't a stable
// signal worth memoizing.
let cachedFor: string | undefined;
let cached: boolean | undefined;

/**
 * Detects whether the current user agent is a bot/crawler.
 * Used to prevent automatic API calls when bots render pages with JavaScript.
 */
export function isBot(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  if (cachedFor !== ua) {
    cached = isbot(ua);
    cachedFor = ua;
  }
  return cached as boolean;
}
