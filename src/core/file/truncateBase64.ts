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

/**
 * Cheap precondition for `standaloneBase64Pattern`: scans for any run of
 * `[A-Za-z0-9+/]` reaching `MIN_BASE64_LENGTH_STANDALONE`, the smallest body
 * the regex can match. When this returns false, the regex provably has zero
 * matches, so we can skip the much more expensive backtracking scan over the
 * whole content. The hot loop avoids regex engine overhead and runs ~4x faster
 * than the original `replace`, which dominated `applyLightweightTransforms`
 * CPU on profiles of repos with `truncateBase64: true`.
 *
 * Newline-bounded prescan: '\n' (0x0A) is not in [A-Za-z0-9+/], so any base64
 * run of length >= MIN_BASE64_LENGTH_STANDALONE must fit entirely inside a
 * single newline-delimited line. The longest line in a content is therefore an
 * upper bound on the longest possible base64 run. `String.prototype.indexOf`
 * for a single character is an optimized native scan (much faster than a JS
 * `charCodeAt` loop), so jumping across newlines lets us bail in microseconds
 * on typical source code (lines ~80-120 chars) without ever entering the
 * per-character body. Measured ~10x faster than the unconditional char scan on
 * a 1000-file source-only sweep (~70 ms → ~6 ms).
 */
const hasLongBase64Run = (content: string): boolean => {
  const len = content.length;
  if (len < MIN_BASE64_LENGTH_STANDALONE) return false;

  let lineStart = 0;
  let foundLongLine = false;
  let nl = content.indexOf('\n');
  while (nl !== -1) {
    if (nl - lineStart >= MIN_BASE64_LENGTH_STANDALONE) {
      foundLongLine = true;
      break;
    }
    lineStart = nl + 1;
    nl = content.indexOf('\n', lineStart);
  }
  // Account for the trailing partial line (or whole content when there are no newlines)
  if (!foundLongLine && len - lineStart < MIN_BASE64_LENGTH_STANDALONE) {
    return false;
  }

  // Slow path: at least one line is long enough to potentially contain a
  // qualifying base64 run; fall back to the original per-char scan to verify.
  let run = 0;
  for (let i = 0; i < len; i++) {
    const c = content.charCodeAt(i);
    // [A-Z]:65-90, [a-z]:97-122, [0-9]:48-57, '+':43, '/':47
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47) {
      run++;
      if (run >= MIN_BASE64_LENGTH_STANDALONE) return true;
    } else {
      run = 0;
    }
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

  // Replace data URIs. The substring guard skips the regex on the vast majority
  // of source files that contain no data URI.
  if (content.includes(';base64,')) {
    dataUriPattern.lastIndex = 0;
    processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  // Replace standalone base64 strings. `hasLongBase64Run` is a fast linear scan
  // that determines whether any match is possible at all.
  if (hasLongBase64Run(processedContent)) {
    standaloneBase64Pattern.lastIndex = 0;
    processedContent = processedContent.replace(standaloneBase64Pattern, (match, base64String) => {
      // Check if this looks like actual base64 (not just a long string)
      if (isLikelyBase64(base64String)) {
        const preview = base64String.substring(0, TRUNCATION_LENGTH);
        return `${preview}...`;
      }
      return match;
    });
  }

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
