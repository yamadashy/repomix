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
const standaloneBase64Pattern = new RegExp(`([A-Za-z0-9+/]{${MIN_BASE64_LENGTH_STANDALONE},}={0,2})`, 'g');

// Lookup table for base64 alphabet: A-Z, a-z, 0-9, +, /
const isBase64Char = (() => {
  const table = new Uint8Array(128);
  for (let i = 65; i <= 90; i++) {
    table[i] = 1;
  } // A-Z
  for (let i = 97; i <= 122; i++) {
    table[i] = 1;
  } // a-z
  for (let i = 48; i <= 57; i++) {
    table[i] = 1;
  } // 0-9
  table[43] = 1; // '+'
  table[47] = 1; // '/'
  return table;
})();

/**
 * Fast pre-scan that returns true if `content` contains at least one run of
 * `MIN_BASE64_LENGTH_STANDALONE` consecutive base64 alphabet characters
 * (`A-Z`, `a-z`, `0-9`, `+`, `/`). This is the necessary condition for
 * `standaloneBase64Pattern` to match anywhere in the content.
 *
 * Uses a newline-gap strategy: since base64 runs cannot span newlines (a
 * newline is not in the base64 alphabet), any qualifying run must exist
 * within a single line. We use `indexOf('\n')` to skip lines shorter than
 * `MIN_BASE64_LENGTH_STANDALONE` entirely, avoiding character-by-character
 * scanning of the vast majority of source code (where lines are typically
 * < 100 chars). Only lines long enough to potentially contain a 256-char
 * run are scanned with the lookup table.
 *
 * Much faster than a full `charCodeAt` scan because `indexOf('\n')` uses
 * V8's optimized native string search, and most source code lines are far
 * shorter than 256 chars.
 */
const hasStandaloneBase64Run = (content: string): boolean => {
  if (content.length < MIN_BASE64_LENGTH_STANDALONE) {
    return false;
  }
  let pos = 0;
  while (pos < content.length) {
    const nlPos = content.indexOf('\n', pos);
    const lineEnd = nlPos === -1 ? content.length : nlPos;

    if (lineEnd - pos >= MIN_BASE64_LENGTH_STANDALONE) {
      // This line is long enough — scan it for a base64 run
      let runLength = 0;
      for (let j = pos; j < lineEnd; j++) {
        const code = content.charCodeAt(j);
        if (code < 128 && isBase64Char[code]) {
          if (++runLength >= MIN_BASE64_LENGTH_STANDALONE) {
            return true;
          }
        } else {
          runLength = 0;
        }
      }
    }

    if (nlPos === -1) break;
    pos = nlPos + 1;
  }
  return false;
};

/**
 * Truncates base64 encoded data in content to reduce file size
 * Detects common base64 patterns like data URIs and standalone base64 strings
 *
 * @param content The content to process
 * @returns Content with base64 data truncated
 */
export const truncateBase64Content = (content: string): string => {
  let processedContent = content;

  // Skip the data-URI regex when the content doesn't contain "data:" at all.
  // indexOf is a single native call in V8 vs the regex engine walking the
  // full string, so this avoids the regex overhead for the majority of
  // source files that contain no data URIs.
  if (content.indexOf('data:') !== -1) {
    dataUriPattern.lastIndex = 0;
    processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  // The standalone-base64 regex is by far the most expensive part of this
  // function on real-world source code. Skip it entirely when the content
  // (post data-URI substitution) cannot possibly contain a qualifying match,
  // i.e. when there is no run of 256+ base64-alphabet characters anywhere.
  // This is the case for the overwhelming majority of source code files.
  if (!hasStandaloneBase64Run(processedContent)) {
    return processedContent;
  }

  // `String.prototype.replace` with a global regex always restores
  // `lastIndex` to 0 on completion (whether or not it found a match), so the
  // pattern is guaranteed to be in a fresh state when we get here. The reset
  // below is defensive — it covers the unlikely case where the pattern object
  // is reused by an external caller between calls — and is otherwise a no-op.
  standaloneBase64Pattern.lastIndex = 0;

  // Replace standalone base64 strings
  processedContent = processedContent.replace(standaloneBase64Pattern, (match, base64String) => {
    // Check if this looks like actual base64 (not just a long string)
    if (isLikelyBase64(base64String)) {
      const preview = base64String.substring(0, TRUNCATION_LENGTH);
      return `${preview}...`;
    }
    return match;
  });

  return processedContent;
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
