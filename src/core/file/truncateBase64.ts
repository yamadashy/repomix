// Constants for base64 detection and truncation
const MIN_BASE64_LENGTH_DATA_URI = 40;
const MIN_BASE64_LENGTH_STANDALONE = 60;
const TRUNCATION_LENGTH = 32;
const MIN_CHAR_DIVERSITY = 10;
const MIN_CHAR_TYPE_COUNT = 3;

// Pre-compiled regex patterns to avoid re-creation on every call
const dataUriPattern = new RegExp(
  `data:([a-zA-Z0-9\\/\\-\\+]+)(;[a-zA-Z0-9\\-=]+)*;base64,([A-Za-z0-9+/=]{${MIN_BASE64_LENGTH_DATA_URI},})`,
  'g',
);
const standaloneBase64Pattern = new RegExp(`([A-Za-z0-9+/]{${MIN_BASE64_LENGTH_STANDALONE},}={0,2})`, 'g');

/**
 * Fast pre-check: does the content potentially contain standalone base64?
 * Scans for a run of 60+ base64 alphabet characters. Exits early on first match.
 * This avoids running the expensive standalone regex on files that cannot match.
 */
const mayContainStandaloneBase64 = (content: string): boolean => {
  let run = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    // Base64 alphabet: A-Z (65-90), a-z (97-122), 0-9 (48-57), + (43), / (47)
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 43 || c === 47) {
      if (++run >= MIN_BASE64_LENGTH_STANDALONE) return true;
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
  // Fast path: skip files with no base64 indicators.
  // Data URIs always contain 'base64,' literal (O(N) string search, V8-optimized).
  // Standalone base64 requires a 60+ char alphanumeric run (char-loop pre-check).
  // Most source files (~95%) fail both checks and return unchanged.
  const hasDataUri = content.includes('base64,');
  const hasStandalone = !hasDataUri && mayContainStandaloneBase64(content);

  if (!hasDataUri && !hasStandalone) {
    return content;
  }

  let processedContent = content;

  // Replace data URIs
  if (hasDataUri) {
    processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  // Replace standalone base64 strings
  if (hasStandalone || hasDataUri) {
    // When data URI was found, also check for standalone base64 in the same content
    if (mayContainStandaloneBase64(processedContent)) {
      processedContent = processedContent.replace(standaloneBase64Pattern, (match, base64String) => {
        if (isLikelyBase64(base64String)) {
          const preview = base64String.substring(0, TRUNCATION_LENGTH);
          return `${preview}...`;
        }
        return match;
      });
    }
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

  const charTypeCount = [hasNumbers, hasUpperCase, hasLowerCase, hasSpecialChars].filter(Boolean).length;

  return charTypeCount >= MIN_CHAR_TYPE_COUNT;
}
