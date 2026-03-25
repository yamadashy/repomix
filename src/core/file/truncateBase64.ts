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
const hasNumbersPattern = /[0-9]/;
const hasUpperCasePattern = /[A-Z]/;
const hasLowerCasePattern = /[a-z]/;
const hasSpecialCharsPattern = /[+/]/;

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
 * Fast pre-check: does content potentially contain standalone base64 strings?
 * First skips lines shorter than 60 chars using V8-optimized indexOf('\n'),
 * then only runs the char-by-char base64 alphabet check on long lines.
 * For typical source code (~40 char avg line length), this skips 80%+ of content.
 */
const mayContainStandaloneBase64 = (content: string): boolean => {
  let pos = 0;
  while (pos < content.length) {
    const nlPos = content.indexOf('\n', pos);
    const lineEnd = nlPos === -1 ? content.length : nlPos;

    // Only scan lines that are long enough to contain a base64 run
    if (lineEnd - pos >= MIN_BASE64_LENGTH_STANDALONE) {
      let runLength = 0;
      for (let i = pos; i < lineEnd; i++) {
        const c = content.charCodeAt(i);
        // A-Z(65-90), a-z(97-122), 0-9(48-57), +(43), /(47)
        if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47) {
          runLength++;
          if (runLength >= MIN_BASE64_LENGTH_STANDALONE) {
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

  // Check for reasonable distribution of characters (not all same char)
  const charSet = new Set(str);
  if (charSet.size < MIN_CHAR_DIVERSITY) {
    return false;
  }

  // Additional check: base64 encoded binary data typically has good character distribution
  // Must have at least MIN_CHAR_TYPE_COUNT of the 4 character types (numbers, uppercase, lowercase, special)
  const hasNumbers = hasNumbersPattern.test(str);
  const hasUpperCase = hasUpperCasePattern.test(str);
  const hasLowerCase = hasLowerCasePattern.test(str);
  const hasSpecialChars = hasSpecialCharsPattern.test(str);

  // Real base64 encoded binary data virtually always contains digits
  if (!hasNumbers) {
    return false;
  }

  const charTypeCount = [hasNumbers, hasUpperCase, hasLowerCase, hasSpecialChars].filter(Boolean).length;

  return charTypeCount >= MIN_CHAR_TYPE_COUNT;
}
