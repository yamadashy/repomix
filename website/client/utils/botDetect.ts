import { isbot } from 'isbot';

/**
 * Detects whether the current user agent is a bot/crawler.
 * Used to prevent automatic API calls when bots render pages with JavaScript.
 */
export function isBot(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return isbot(navigator.userAgent);
}
