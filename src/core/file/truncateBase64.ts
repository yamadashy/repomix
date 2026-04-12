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
 * Fast pre-scan that returns true if `content` contains at least one run of
 * `MIN_BASE64_LENGTH_STANDALONE` consecutive base64 alphabet characters
 * (`A-Z`, `a-z`, `0-9`, `+`, `/`). This is the necessary condition for
 * `standaloneBase64Pattern` to match anywhere in the content.
 *
 * Iterating with `charCodeAt` and a counter is roughly 5-10x faster than
 * letting V8's regex engine walk the same string with the global pattern,
 * because we exit at the first qualifying run instead of continuing to
 * collect all matches and we avoid all regex bookkeeping. The vast majority
 * of source files contain no such run, so this turns the standalone replace
 * into a no-op for them.
 */
const hasStandaloneBase64Run = (content: string): boolean => {
  let runLength = 0;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    // [A-Z] | [a-z] | [0-9] | '+' | '/'
    if (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57) ||
      code === 43 ||
      code === 47
    ) {
      runLength++;
      if (runLength >= MIN_BASE64_LENGTH_STANDALONE) {
        return true;
      }
    } else {
      runLength = 0;
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
  // Reset lastIndex since patterns are global and reused across calls
  dataUriPattern.lastIndex = 0;

  let processedContent = content;

  // Replace data URIs
  processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
    const preview = base64Data.substring(0, TRUNCATION_LENGTH);
    return `data:${mimeType}${params || ''};base64,${preview}...`;
  });

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
