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
const base64ValidCharsPattern = /^[A-Za-z0-9+/]+=*$/;

/**
 * Truncates base64 encoded data in content to reduce file size
 * Detects common base64 patterns like data URIs and standalone base64 strings
 *
 * @param content The content to process
 * @returns Content with base64 data truncated
 */
/**
 * Fast pre-check: does content potentially contain base64 data URIs?
 * Uses V8-optimized string.includes() to skip expensive regex for ~95% of source files.
 */
const mayContainDataUri = (content: string): boolean => content.includes('base64,');

/**
 * Pre-computed lookup table for base64 alphabet characters.
 * Single array access replaces 6 comparisons (4 ranges + 2 equalities) per character,
 * giving ~2x speedup on the inner loop of base64 run detection for long lines.
 */
const isBase64Char = new Uint8Array(128);
for (let i = 65; i <= 90; i++) isBase64Char[i] = 1; // A-Z
for (let i = 97; i <= 122; i++) isBase64Char[i] = 1; // a-z
for (let i = 48; i <= 57; i++) isBase64Char[i] = 1; // 0-9
isBase64Char[43] = 1; // +
isBase64Char[47] = 1; // /

/**
 * Fast pre-check: does content potentially contain standalone base64 strings?
 * First skips lines shorter than 60 chars using V8-optimized indexOf('\n'),
 * then only runs the char-by-char base64 alphabet check on long lines.
 * Uses a Uint8Array lookup table instead of range comparisons for ~2x inner loop speedup.
 * For typical source code (~40 char avg line length), this skips 80%+ of content.
 */
const mayContainStandaloneBase64 = (content: string): boolean => {
  // Files shorter than the minimum run length can't contain a match
  if (content.length < MIN_BASE64_LENGTH_STANDALONE) return false;

  let pos = 0;
  while (pos < content.length) {
    const nlPos = content.indexOf('\n', pos);
    const lineEnd = nlPos === -1 ? content.length : nlPos;

    // Only scan lines that are long enough to contain a base64 run
    if (lineEnd - pos >= MIN_BASE64_LENGTH_STANDALONE) {
      let runLength = 0;
      for (let i = pos; i < lineEnd; i++) {
        const c = content.charCodeAt(i);
        if (c < 128 && isBase64Char[c]) {
          if (++runLength >= MIN_BASE64_LENGTH_STANDALONE) {
            return true;
          }
        } else {
          runLength = 0;
        }
      }
    }

    if (nlPos === -1) break;
    pos = nlPos + 1;
  }
  return false;
};

export const truncateBase64Content = (content: string): string => {
  const hasDataUri = mayContainDataUri(content);
  const hasStandalone = mayContainStandaloneBase64(content);

  // Skip expensive regex if no base64-like content detected
  if (!hasDataUri && !hasStandalone) {
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
  if (hasStandalone) {
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
  if (!base64ValidCharsPattern.test(str)) {
    return false;
  }

  // Single-pass check: count distinct characters AND detect char types simultaneously.
  // Replaces the previous two-phase approach (Uint8Array diversity loop + 4 separate
  // regex .test() calls) with one loop that exits early once both thresholds are met.
  // For typical 60-200 char base64 matches, exits after ~15-20 chars.
  const seen = new Uint8Array(128);
  let distinctCount = 0;
  let hasNumbers = false;
  let hasUpperCase = false;
  let hasLowerCase = false;
  let hasSpecialChars = false;
  let charTypeCount = 0;

  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 128 && !seen[c]) {
      seen[c] = 1;
      distinctCount++;

      // Detect char type on first occurrence of each character
      if (!hasNumbers && c >= 48 && c <= 57) {
        hasNumbers = true;
        charTypeCount++;
      } else if (!hasUpperCase && c >= 65 && c <= 90) {
        hasUpperCase = true;
        charTypeCount++;
      } else if (!hasLowerCase && c >= 97 && c <= 122) {
        hasLowerCase = true;
        charTypeCount++;
      } else if (!hasSpecialChars && (c === 43 || c === 47)) {
        hasSpecialChars = true;
        charTypeCount++;
      }

      // Early exit: both diversity and char-type thresholds met
      if (distinctCount >= MIN_CHAR_DIVERSITY && charTypeCount >= MIN_CHAR_TYPE_COUNT) {
        return true;
      }
    }
  }

  return distinctCount >= MIN_CHAR_DIVERSITY && charTypeCount >= MIN_CHAR_TYPE_COUNT;
}
