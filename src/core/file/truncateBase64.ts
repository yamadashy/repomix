// Constants for base64 detection and truncation
const MIN_BASE64_LENGTH_DATA_URI = 40;
const MIN_BASE64_LENGTH_STANDALONE = 256;
const TRUNCATION_LENGTH = 32;
const MIN_CHAR_DIVERSITY = 10;
const MIN_CHAR_TYPE_COUNT = 3;

// Pre-compiled regex patterns (avoid re-creation per file)
const dataUriPattern = new RegExp(
  `data:([a-zA-Z0-9\\/\\-\\+]+)(;[a-zA-Z0-9\\-=]+)*;base64,([A-Za-z0-9+/=]{${MIN_BASE64_LENGTH_DATA_URI},})`,
  'g',
);

// Lookup table for base64 characters: A-Z, a-z, 0-9, +, /
// Using a boolean array indexed by char code for O(1) lookups
const isBase64Char = new Uint8Array(128);
for (let i = 65; i <= 90; i++) isBase64Char[i] = 1; // A-Z
for (let i = 97; i <= 122; i++) isBase64Char[i] = 1; // a-z
for (let i = 48; i <= 57; i++) isBase64Char[i] = 1; // 0-9
isBase64Char[43] = 1; // +
isBase64Char[47] = 1; // /

/**
 * Truncates base64 encoded data in content to reduce file size
 * Detects common base64 patterns like data URIs and standalone base64 strings
 *
 * @param content The content to process
 * @returns Content with base64 data truncated
 */
export const truncateBase64Content = (content: string): string => {
  // Reset lastIndex since patterns are global and reused across calls
  dataUriPattern.lastIndex = 0;

  let processedContent = content;

  // Replace data URIs
  processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
    const preview = base64Data.substring(0, TRUNCATION_LENGTH);
    return `data:${mimeType}${params || ''};base64,${preview}...`;
  });

  // Replace standalone base64 strings using manual scanning instead of regex.
  // This is significantly faster than the regex /([A-Za-z0-9+/]{256,}={0,2})/g
  // because it avoids regex engine overhead on multi-MB content.
  processedContent = replaceStandaloneBase64(processedContent);

  return processedContent;
};

/**
 * Scans content for runs of 256+ base64 characters and truncates them.
 * Uses a single O(n) pass with a char-code lookup table instead of regex.
 */
const replaceStandaloneBase64 = (content: string): string => {
  const len = content.length;
  let runStart = -1;
  let hasMatch = false;

  // First pass: check if there are any 256+ char runs (fast exit for most files)
  for (let i = 0; i <= len; i++) {
    const ch = i < len ? content.charCodeAt(i) : 0;
    if (ch < 128 && isBase64Char[ch]) {
      if (runStart === -1) runStart = i;
    } else {
      if (runStart !== -1) {
        // Include trailing '=' padding (up to 2, matching base64 standard)
        let end = i;
        const maxPadFirst = Math.min(end + 2, len);
        while (end < maxPadFirst && content.charCodeAt(end) === 61) end++;
        const runLen = end - runStart;
        if (runLen >= MIN_BASE64_LENGTH_STANDALONE) {
          hasMatch = true;
          break;
        }
        runStart = -1;
      }
    }
  }

  if (!hasMatch) return content;

  // Second pass: build result with truncated base64 sequences
  const parts: string[] = [];
  let lastEnd = 0;
  runStart = -1;

  for (let i = 0; i <= len; i++) {
    const ch = i < len ? content.charCodeAt(i) : 0;
    if (ch < 128 && isBase64Char[ch]) {
      if (runStart === -1) runStart = i;
    } else {
      if (runStart !== -1) {
        // Include trailing '=' padding (up to 2)
        let end = i;
        const maxPad = Math.min(end + 2, len);
        while (end < maxPad && content.charCodeAt(end) === 61) end++;
        const runLen = end - runStart;

        if (runLen >= MIN_BASE64_LENGTH_STANDALONE) {
          const base64Str = content.slice(runStart, end);
          if (isLikelyBase64(base64Str)) {
            parts.push(content.slice(lastEnd, runStart));
            parts.push(base64Str.substring(0, TRUNCATION_LENGTH));
            parts.push('...');
            lastEnd = end;
          }
        }
        runStart = -1;
        // Advance i past any '=' we consumed
        if (end > i) i = end - 1;
      }
    }
  }

  if (lastEnd === 0) return content;
  parts.push(content.slice(lastEnd));
  return parts.join('');
};

/**
 * Checks if a string is likely to be base64 encoded data
 *
 * @param str The string to check
 * @returns True if the string appears to be base64 encoded
 */
function isLikelyBase64(str: string): boolean {
  // Single-pass validation: check character validity, diversity, and type distribution together.
  // This avoids creating a Set (O(n) allocation) and scanning the string multiple times.
  let hasNumbers = false;
  let hasUpperCase = false;
  let hasLowerCase = false;
  let hasSpecialChars = false;
  const seen = new Uint8Array(128); // Track unique chars for diversity check
  let uniqueCount = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);

    // Validate: only base64 chars and '=' are allowed
    if (ch >= 128 || (!isBase64Char[ch] && ch !== 61)) {
      return false;
    }

    // Track character diversity
    if (ch < 128 && !seen[ch]) {
      seen[ch] = 1;
      uniqueCount++;
    }

    // Track character type distribution
    if (ch >= 48 && ch <= 57) hasNumbers = true;
    else if (ch >= 65 && ch <= 90) hasUpperCase = true;
    else if (ch >= 97 && ch <= 122) hasLowerCase = true;
    else if (ch === 43 || ch === 47) hasSpecialChars = true;

    // Early exit: enough diversity and all common types found
    if (uniqueCount >= MIN_CHAR_DIVERSITY && hasNumbers && hasUpperCase && hasLowerCase) return true;
  }

  if (uniqueCount < MIN_CHAR_DIVERSITY) return false;

  // Real base64 encoded binary data virtually always contains digits
  if (!hasNumbers) return false;

  const charTypeCount = [hasNumbers, hasUpperCase, hasLowerCase, hasSpecialChars].filter(Boolean).length;
  return charTypeCount >= MIN_CHAR_TYPE_COUNT;
}
