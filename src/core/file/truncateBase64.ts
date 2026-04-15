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

// Lookup table for base64 alphabet characters (A-Z, a-z, 0-9, +, /)
// Using a Uint8Array for cache-friendly O(1) lookups in the hot loop.
const isBase64Char = new Uint8Array(128);
for (let c = 48; c <= 57; c++) isBase64Char[c] = 1; // 0-9
for (let c = 65; c <= 90; c++) isBase64Char[c] = 1; // A-Z
for (let c = 97; c <= 122; c++) isBase64Char[c] = 1; // a-z
isBase64Char[43] = 1; // +
isBase64Char[47] = 1; // /

/**
 * Fast pre-scan: check if content contains any run of base64 characters
 * at least MIN_BASE64_LENGTH_STANDALONE long.
 *
 * Two-phase approach for efficiency:
 * 1. Find lines >= 256 chars via indexOf('\n') — most source code lines are
 *    well under 256 chars, so this skips the majority of content cheaply.
 * 2. Only scan the long lines with charCode checks for base64 characters.
 *
 * This rejects most files in a typical repo, avoiding the expensive
 * unanchored global regex that would otherwise scan every byte.
 */
const hasLongBase64Run = (content: string): boolean => {
  if (content.length < MIN_BASE64_LENGTH_STANDALONE) return false;

  let lineStart = 0;
  let pos: number;

  // biome-ignore lint/suspicious/noAssignInExpressions: tight loop
  while ((pos = content.indexOf('\n', lineStart)) !== -1) {
    if (pos - lineStart >= MIN_BASE64_LENGTH_STANDALONE) {
      if (scanLineForBase64(content, lineStart, pos)) return true;
    }
    lineStart = pos + 1;
  }

  // Check the final line (no trailing newline)
  if (content.length - lineStart >= MIN_BASE64_LENGTH_STANDALONE) {
    if (scanLineForBase64(content, lineStart, content.length)) return true;
  }

  return false;
};

/**
 * Scan a single line segment [start, end) for a run of base64 characters
 * at least MIN_BASE64_LENGTH_STANDALONE long.
 */
const scanLineForBase64 = (content: string, start: number, end: number): boolean => {
  let run = 0;
  for (let i = start; i < end; i++) {
    const c = content.charCodeAt(i);
    if (c < 128 && isBase64Char[c]) {
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
  // Replace data URIs — only invoke regex if content contains "data:"
  let processedContent = content;
  if (content.includes('data:')) {
    dataUriPattern.lastIndex = 0;
    processedContent = content.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  // Fast path: skip the expensive unanchored standalone base64 regex when
  // no run of 256+ base64 characters exists. The two-phase scan (line-length
  // check then charCode verification) rejects 99%+ of source files cheaply.
  if (!hasLongBase64Run(processedContent)) {
    return processedContent;
  }

  // Replace standalone base64 strings
  standaloneBase64Pattern.lastIndex = 0;
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
