// Constants for base64 detection and truncation
const MIN_BASE64_LENGTH_DATA_URI = 40;
const MIN_BASE64_LENGTH_STANDALONE = 60;
const TRUNCATION_LENGTH = 32;
const MIN_CHAR_DIVERSITY = 10;
const MIN_CHAR_TYPE_COUNT = 3;

// Pre-compiled regex patterns (avoid recompilation per call)
const BASE64_CHARS_ONLY_RE = /^[A-Za-z0-9+/]+=*$/;
const HAS_NUMBERS_RE = /[0-9]/;
const HAS_UPPERCASE_RE = /[A-Z]/;
const HAS_LOWERCASE_RE = /[a-z]/;
const HAS_SPECIAL_RE = /[+/]/;
const DATA_URI_RE = new RegExp(
  `data:([a-zA-Z0-9\\/\\-\\+]+)(;[a-zA-Z0-9\\-=]+)*;base64,([A-Za-z0-9+/=]{${MIN_BASE64_LENGTH_DATA_URI},})`,
  'g',
);
const STANDALONE_BASE64_RE = new RegExp(`([A-Za-z0-9+/]{${MIN_BASE64_LENGTH_STANDALONE},}={0,2})`, 'g');

/**
 * Truncates base64 encoded data in content to reduce file size
 * Detects common base64 patterns like data URIs and standalone base64 strings
 *
 * @param content The content to process
 * @returns Content with base64 data truncated
 */
export const truncateBase64Content = (content: string): string => {
  // Fast pre-check: skip expensive regex for files without base64 content (~95% of source files)
  const hasDataUri = content.includes('base64,');
  const hasStandaloneBase64 = !hasDataUri && hasLongBase64Run(content);

  if (!hasDataUri && !hasStandaloneBase64) {
    return content;
  }

  let processedContent = content;

  // Replace data URIs
  if (hasDataUri) {
    // Reset lastIndex for global regex reuse
    DATA_URI_RE.lastIndex = 0;
    processedContent = processedContent.replace(DATA_URI_RE, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  // Replace standalone base64 strings (only if no data URI was found, or check independently)
  if (hasLongBase64Run(processedContent)) {
    STANDALONE_BASE64_RE.lastIndex = 0;
    processedContent = processedContent.replace(STANDALONE_BASE64_RE, (match, base64String) => {
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
 * Fast O(N) scan for long runs of base64 alphabet characters.
 * Returns true if any run of 60+ consecutive base64 chars is found.
 */
function hasLongBase64Run(content: string): boolean {
  let runLength = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    // A-Z (65-90), a-z (97-122), 0-9 (48-57), + (43), / (47)
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47) {
      runLength++;
      if (runLength >= MIN_BASE64_LENGTH_STANDALONE) {
        return true;
      }
    } else {
      runLength = 0;
    }
  }
  return false;
}

/**
 * Checks if a string is likely to be base64 encoded data
 *
 * @param str The string to check
 * @returns True if the string appears to be base64 encoded
 */
function isLikelyBase64(str: string): boolean {
  // Check for valid base64 characters only
  if (!BASE64_CHARS_ONLY_RE.test(str)) {
    return false;
  }

  // Check for reasonable distribution of characters (not all same char)
  const charSet = new Set(str);
  if (charSet.size < MIN_CHAR_DIVERSITY) {
    return false;
  }

  // Additional check: base64 encoded binary data typically has good character distribution
  // Must have at least MIN_CHAR_TYPE_COUNT of the 4 character types (numbers, uppercase, lowercase, special)
  const hasNumbers = HAS_NUMBERS_RE.test(str);
  const hasUpperCase = HAS_UPPERCASE_RE.test(str);
  const hasLowerCase = HAS_LOWERCASE_RE.test(str);
  const hasSpecialChars = HAS_SPECIAL_RE.test(str);

  const charTypeCount = [hasNumbers, hasUpperCase, hasLowerCase, hasSpecialChars].filter(Boolean).length;

  return charTypeCount >= MIN_CHAR_TYPE_COUNT;
}
