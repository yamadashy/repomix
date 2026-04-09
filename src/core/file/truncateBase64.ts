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

// Lookup table for base64 characters: A-Z, a-z, 0-9, +, /
const b64Lookup = new Uint8Array(128);
for (let i = 65; i <= 90; i++) b64Lookup[i] = 1; // A-Z
for (let i = 97; i <= 122; i++) b64Lookup[i] = 1; // a-z
for (let i = 48; i <= 57; i++) b64Lookup[i] = 1; // 0-9
b64Lookup[43] = 1; // +
b64Lookup[47] = 1; // /

/**
 * Fast pre-check using indexOf('\n') to find lines >= MIN_BASE64_LENGTH_STANDALONE.
 * V8's indexOf uses SIMD-accelerated native code, making this ~7x faster than
 * charCodeAt iteration for typical source code where most lines are short.
 * Only files with at least one long line can contain a standalone base64 run.
 */
const hasLongLine = (content: string): boolean => {
  let pos = 0;
  let idx = content.indexOf('\n');
  while (idx !== -1) {
    if (idx - pos >= MIN_BASE64_LENGTH_STANDALONE) return true;
    pos = idx + 1;
    idx = content.indexOf('\n', pos);
  }
  return content.length - pos >= MIN_BASE64_LENGTH_STANDALONE;
};

/**
 * Fast pre-check: scan content for a run of MIN_BASE64_LENGTH_STANDALONE+
 * consecutive base64 characters. Returns false (and avoids the expensive
 * regex) when no such run exists — which is the common case for source code.
 *
 * Uses a three-phase approach:
 * 1. Skip files shorter than the minimum run length
 * 2. Skip files where no line is long enough to contain a base64 run
 *    (uses indexOf('\n') which is SIMD-accelerated in V8)
 * 3. Full character scan only for files that pass both filters
 */
const hasLongBase64Run = (content: string): boolean => {
  if (content.length < MIN_BASE64_LENGTH_STANDALONE) return false;
  if (!hasLongLine(content)) return false;

  let run = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    if (c < 128 && b64Lookup[c]) {
      if (++run >= MIN_BASE64_LENGTH_STANDALONE) {
        return true;
      }
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
  // Fast path: skip the expensive regex when the content has no data URIs
  // and no long runs of base64 characters (the common case for source code).
  const hasDataUri = content.includes(';base64,');
  const hasStandaloneBase64 = hasLongBase64Run(content);

  if (!hasDataUri && !hasStandaloneBase64) {
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
  if (hasStandaloneBase64) {
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
