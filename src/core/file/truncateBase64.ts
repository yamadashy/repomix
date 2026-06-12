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

// [A-Z]:65-90, [a-z]:97-122, [0-9]:48-57, '+':43, '/':47
const isBase64CharCode = (c: number): boolean =>
  (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47;

/**
 * Cheap precondition for `standaloneBase64Pattern`: detects whether any run of
 * `[A-Za-z0-9+/]` reaches `MIN_BASE64_LENGTH_STANDALONE`, the smallest body
 * the regex can match. When this returns false, the regex provably has zero
 * matches, so we can skip the much more expensive backtracking scan over the
 * whole content.
 *
 * Instead of testing every character, the scan samples one character every
 * `MIN_BASE64_LENGTH_STANDALONE` positions: a run of that length occupies
 * `MIN_BASE64_LENGTH_STANDALONE` consecutive indices, so it necessarily
 * contains a sample point — no qualifying run can slip between two samples.
 * Only when a sampled character is in the base64 class does the scan expand
 * outward to measure the surrounding run (bounded by the run itself, typically
 * a handful of characters in source code). This probes one in
 * `MIN_BASE64_LENGTH_STANDALONE` characters plus a short expansion per hit,
 * and replaced a per-character loop that dominated
 * `applyLightweightTransforms` CPU on profiles of repos with
 * `truncateBase64: true`.
 */
const hasLongBase64Run = (content: string): boolean => {
  const len = content.length;
  if (len < MIN_BASE64_LENGTH_STANDALONE) return false;
  let i = MIN_BASE64_LENGTH_STANDALONE - 1;
  while (true) {
    // Clamp the last sample to the final character so the trailing partial
    // window (shorter than the sampling stride) is still covered.
    if (i >= len) i = len - 1;
    if (isBase64CharCode(content.charCodeAt(i))) {
      // Sample hit: measure the maximal run containing it.
      let lo = i - 1;
      while (lo >= 0 && isBase64CharCode(content.charCodeAt(lo))) lo--;
      let hi = i + 1;
      while (hi < len && isBase64CharCode(content.charCodeAt(hi))) hi++;
      if (hi - lo - 1 >= MIN_BASE64_LENGTH_STANDALONE) return true;
      // The run around this sample is too short. Resume sampling after it:
      // `hi` is a non-base64 index (or `len`), so the next possible run starts
      // at `hi + 1` and any qualifying run from there contains index
      // `hi + MIN_BASE64_LENGTH_STANDALONE`.
      i = hi;
    }
    if (i >= len - 1) return false;
    i += MIN_BASE64_LENGTH_STANDALONE;
  }
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
