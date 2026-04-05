const BOT_UA_PATTERN =
  /bot|crawler|spider|crawling|Applebot|Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|LinkedInBot|Twitterbot|Discordbot|WhatsApp|TelegramBot|Bytespider|GPTBot|ClaudeBot|CCBot|Amazonbot/i;

/**
 * Detects whether the current user agent is a bot/crawler.
 * Used to prevent automatic API calls when bots render pages with JavaScript.
 */
export function isBot(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return BOT_UA_PATTERN.test(navigator.userAgent);
}
