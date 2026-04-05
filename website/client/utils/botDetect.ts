// Specific bot User-Agent patterns only — no bare "bot"/"spider" to avoid
// false positives on legitimate devices (e.g., Cubot phones).
const BOT_UA_PATTERN =
  /Applebot|Googlebot|Bingbot|Baiduspider|YandexBot|DuckDuckBot|Slurp|facebookexternalhit|LinkedInBot|Twitterbot|Discordbot|WhatsApp|TelegramBot|Bytespider|GPTBot|ClaudeBot|CCBot|Amazonbot|PetalBot|SemrushBot|AhrefsBot/i;

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
