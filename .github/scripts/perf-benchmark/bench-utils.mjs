/**
 * Escape HTML special characters for safe embedding in comments.
 */
export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Extract benchmark history JSON embedded in an HTML comment.
 */
export function extractHistory(body) {
  const jsonMatch = body.match(/<!-- bench-history-json-start ([\s\S]*?) bench-history-json-end -->/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[1]);
  } catch (e) {
    console.error('Failed to parse benchmark history:', e);
    return [];
  }
}

/**
 * Render history entries as collapsible HTML.
 */
export function renderHistory(hist) {
  if (hist.length === 0) return '';
  return hist
    .map((h) => {
      const label = `${h.sha}${h.msg ? ` ${h.msg}` : ''}`;
      const osRows = ['ubuntu', 'macos', 'windows']
        .filter((os) => h[os] && h[os] !== '-')
        .map((os) => {
          const osLabel = os === 'ubuntu' ? 'Ubuntu' : os === 'macos' ? 'macOS' : 'Windows';
          return `<tr><td><strong>${osLabel}:</strong></td><td>${h[os]}</td></tr>`;
        })
        .join('\n');
      return `${label}\n<table>\n${osRows}\n</table>`;
    })
    .join('\n\n');
}
