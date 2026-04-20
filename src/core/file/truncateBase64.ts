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
 * Truncates base64 encoded data in content to reduce file size
 * Detects common base64 patterns like data URIs and standalone base64 strings
 *
 * @param content The content to process
 * @returns Content with base64 data truncated
 */
export const truncateBase64Content = (content: string): string => {
  // Reset lastIndex since patterns are global and reused across calls
  dataUriPattern.lastIndex = 0;
  standaloneBase64Pattern.lastIndex = 0;

  let processedContent = content;

  // Replace data URIs
  processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
    const preview = base64Data.substring(0, TRUNCATION_LENGTH);
    return `data:${mimeType}${params || ''};base64,${preview}...`;
  });

  // Standalone base64 detection requires a run of ≥MIN_BASE64_LENGTH_STANDALONE chars in
  // [A-Za-z0-9+/]. Any newline breaks that run, so if no single line reaches that length
  // the regex cannot possibly match. Source-code repositories overwhelmingly consist of
  // short lines, so this cheap pre-scan lets the vast majority of files skip an O(n) regex
  // scan whose replace() also allocates a fresh string per call.
  if (hasLineAtLeast(processedContent, MIN_BASE64_LENGTH_STANDALONE)) {
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

const hasLineAtLeast = (content: string, minLen: number): boolean => {
  if (content.length < minLen) return false;
  let start = 0;
  while (start <= content.length - minLen) {
    const nl = content.indexOf('\n', start);
    if (nl === -1) {
      return content.length - start >= minLen;
    }
    if (nl - start >= minLen) {
      return true;
    }
    start = nl + 1;
  }
  return false;
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
