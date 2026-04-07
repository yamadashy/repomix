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
 * Fast check: does the content have any line with 256+ characters?
 * Uses String.indexOf (SIMD-accelerated in V8) to find newlines quickly.
 * Standalone base64 must appear as a long run within a line, so short-line
 * files can't contain it.
 */
const hasLongLine = (content: string, minLen: number): boolean => {
  let start = 0;
  for (;;) {
    const nlIdx = content.indexOf('\n', start);
    const end = nlIdx === -1 ? content.length : nlIdx;
    if (end - start >= minLen) return true;
    if (nlIdx === -1) return false;
    start = nlIdx + 1;
  }
};

/**
 * Check if content has a run of 256+ consecutive non-whitespace characters.
 * Base64 strings are dense (no spaces/newlines), so this filters out files
 * where long lines are just code with spaces.
 */
const hasLongNonWhitespaceRun = (content: string, minLen: number): boolean => {
  let run = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    // Treat ASCII control chars and space (0-32) as whitespace
    if (c <= 32) {
      run = 0;
    } else if (++run >= minLen) {
      return true;
    }
  }
  return false;
};

/**
 * Truncates base64 encoded data in content to reduce file size
 * Detects common base64 patterns like data URIs and standalone base64 strings
 *
 * Uses a two-phase fast-path to avoid expensive regex scans on files that
 * clearly don't contain base64 data:
 * - Data URIs: gated by String.includes('base64,') (~2ms for 1000 files)
 * - Standalone base64: gated by line-length check then non-whitespace run check
 *   (~9ms for 1000 files vs ~80ms for ungated regex scan)
 *
 * @param content The content to process
 * @returns Content with base64 data truncated
 */
export const truncateBase64Content = (content: string): string => {
  // Check if either type of base64 could be present
  const hasDataUri = content.includes('base64,');
  const couldHaveStandalone =
    hasLongLine(content, MIN_BASE64_LENGTH_STANDALONE) &&
    hasLongNonWhitespaceRun(content, MIN_BASE64_LENGTH_STANDALONE);

  // Fast path: skip files with no potential base64 content
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
