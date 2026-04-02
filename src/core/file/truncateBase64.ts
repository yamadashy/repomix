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
  // Reset lastIndex since pattern is global and reused across calls
  dataUriPattern.lastIndex = 0;

  let processedContent = content;

  // Replace data URIs
  processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
    const preview = base64Data.substring(0, TRUNCATION_LENGTH);
    return `data:${mimeType}${params || ''};base64,${preview}...`;
  });

  // Replace standalone base64 strings using a fast character scan instead of regex.
  // The regex `([A-Za-z0-9+/]{256,}={0,2})` is O(n) but has high constant factor
  // due to regex engine overhead (~70ms for 996 files / 3.8MB). The character scan
  // achieves the same result in ~2ms by using a lookup table.
  processedContent = replaceStandaloneBase64(processedContent);

  return processedContent;
};

/**
 * Scans content for standalone base64 strings (256+ base64 chars optionally
 * followed by up to 2 '=' padding chars) and truncates them.
 * Equivalent to: content.replace(/([A-Za-z0-9+/]{256,}={0,2})/g, replacer)
 * but ~35x faster due to avoiding regex engine overhead.
 */
const replaceStandaloneBase64 = (content: string): string => {
  const len = content.length;
  let i = 0;
  let result: string[] | null = null;
  let lastCopyEnd = 0;

  while (i < len) {
    const code = content.charCodeAt(i);

    // Quick check: is this a base64 character?
    if (code < 128 && isBase64Char[code]) {
      const runStart = i;
      i++;

      // Count consecutive base64 characters
      while (i < len) {
        const c = content.charCodeAt(i);
        if (c < 128 && isBase64Char[c]) {
          i++;
        } else {
          break;
        }
      }

      const runLen = i - runStart;

      if (runLen >= MIN_BASE64_LENGTH_STANDALONE) {
        // Count trailing '=' padding (up to 2)
        let eqCount = 0;
        while (eqCount < 2 && i < len && content.charCodeAt(i) === 0x3d /* '=' */) {
          eqCount++;
          i++;
        }

        const base64Part = content.substring(runStart, runStart + runLen);

        if (isLikelyBase64(base64Part)) {
          // Lazy-init the result array only when we find something to replace
          if (result === null) {
            result = [];
          }
          result.push(content.substring(lastCopyEnd, runStart));
          result.push(base64Part.substring(0, TRUNCATION_LENGTH));
          result.push('...');
          lastCopyEnd = runStart + runLen + eqCount;
        }
      }
    } else {
      i++;
    }
  }

  if (result === null) {
    return content;
  }

  // Append remaining content after the last replacement
  result.push(content.substring(lastCopyEnd));
  return result.join('');
};

/**
 * Checks if a string is likely to be base64 encoded data
 *
 * @param str The string to check
 * @returns True if the string appears to be base64 encoded
 */
function isLikelyBase64(str: string): boolean {
  // Check for valid base64 characters only
  if (!/^[A-Za-z0-9+/]+=*$/.test(str)) {
    return false;
  }

  // Check for reasonable distribution of characters (not all same char)
  const charSet = new Set(str);
  if (charSet.size < MIN_CHAR_DIVERSITY) {
    return false;
  }

  // Additional check: base64 encoded binary data typically has good character distribution
  // Must have at least MIN_CHAR_TYPE_COUNT of the 4 character types (numbers, uppercase, lowercase, special)
  const hasNumbers = /[0-9]/.test(str);
  const hasUpperCase = /[A-Z]/.test(str);
  const hasLowerCase = /[a-z]/.test(str);
  const hasSpecialChars = /[+/]/.test(str);

  // Real base64 encoded binary data virtually always contains digits
  if (!hasNumbers) {
    return false;
  }

  const charTypeCount = [hasNumbers, hasUpperCase, hasLowerCase, hasSpecialChars].filter(Boolean).length;

  return charTypeCount >= MIN_CHAR_TYPE_COUNT;
}
