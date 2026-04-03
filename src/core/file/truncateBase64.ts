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
  // Fast path: skip regex scanning for files that cannot contain base64 data.
  // Standalone base64 strings (256+ alphanumeric chars) are hard to pre-check cheaply,
  // but data URIs always contain the literal "base64," marker. Files shorter than the
  // minimum standalone length also cannot match.
  const hasDataUri = content.includes('base64,');
  const couldHaveStandalone = content.length >= MIN_BASE64_LENGTH_STANDALONE;
  if (!hasDataUri && !couldHaveStandalone) {
    return content;
  }

  let processedContent = content;

  // Replace data URIs
  if (hasDataUri) {
    dataUriPattern.lastIndex = 0;
    processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  // Replace standalone base64 strings
  if (couldHaveStandalone) {
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
