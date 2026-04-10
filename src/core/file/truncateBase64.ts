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
 * Fast check for whether the content contains a run of base64 alphabet characters
 * of at least `minLength`. Much cheaper than a regex scan because it uses simple
 * charCodeAt comparisons in a single linear pass and exits early on first hit.
 */
const hasLongBase64Run = (content: string, minLength: number): boolean => {
  let runLength = 0;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    // Base64 alphabet + padding: A-Z (65-90), a-z (97-122), 0-9 (48-57), + (43), / (47), = (61)
    // Including = is intentionally permissive: the standalone regex requires 256+ chars from
    // [A-Za-z0-9+/] with optional trailing =, so = doesn't count toward the regex minimum.
    // This makes the pre-check a sound over-approximation (never misses, may over-trigger).
    if (
      (ch >= 48 && ch <= 57) ||
      (ch >= 65 && ch <= 90) ||
      (ch >= 97 && ch <= 122) ||
      ch === 43 ||
      ch === 47 ||
      ch === 61
    ) {
      runLength++;
      if (runLength >= minLength) return true;
    } else {
      // Early exit: not enough remaining characters to reach minLength
      if (content.length - i - 1 < minLength) return false;
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
  // Fast path: content too short to contain any base64 match
  if (content.length < MIN_BASE64_LENGTH_DATA_URI) return content;

  let processedContent = content;

  // Only run the data URI regex if the content contains the 'base64,' marker.
  // String.includes is a native substring search (Boyer-Moore in V8), far cheaper
  // than a full regex scan for files that contain no data URIs.
  if (content.includes('base64,')) {
    dataUriPattern.lastIndex = 0;
    processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  // Only run the standalone base64 regex if the content is long enough and a
  // long-enough base64-like character sequence actually exists. The linear scan
  // in hasLongBase64Run is much cheaper than the regex engine for the common case
  // (source code with frequent whitespace and punctuation that breaks any long
  // alphanumeric run).
  if (
    processedContent.length >= MIN_BASE64_LENGTH_STANDALONE &&
    hasLongBase64Run(processedContent, MIN_BASE64_LENGTH_STANDALONE)
  ) {
    standaloneBase64Pattern.lastIndex = 0;
    processedContent = processedContent.replace(standaloneBase64Pattern, (match, base64String) => {
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
