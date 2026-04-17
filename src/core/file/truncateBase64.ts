const MIN_BASE64_LENGTH_DATA_URI = 40;
const MIN_BASE64_LENGTH_STANDALONE = 256;
const TRUNCATION_LENGTH = 32;
const MIN_CHAR_DIVERSITY = 10;
const MIN_CHAR_TYPE_COUNT = 3;
const EQUALS_CHAR_CODE = 61;

// Avoid re-creation per call
const dataUriPattern = new RegExp(
  `data:([a-zA-Z0-9\\/\\-\\+]+)(;[a-zA-Z0-9\\-=]+)*;base64,([A-Za-z0-9+/=]{${MIN_BASE64_LENGTH_DATA_URI},})`,
  'g',
);

// Lookup table for base64 alphabet characters (A-Z, a-z, 0-9, +, /)
// Using a Uint8Array for cache-friendly O(1) lookups in the hot loop.
const isBase64Char = new Uint8Array(128);
for (let c = 48; c <= 57; c++) isBase64Char[c] = 1; // 0-9
for (let c = 65; c <= 90; c++) isBase64Char[c] = 1; // A-Z
for (let c = 97; c <= 122; c++) isBase64Char[c] = 1; // a-z
isBase64Char[43] = 1; // +
isBase64Char[47] = 1; // /

const replaceStandaloneBase64 = (content: string): string => {
  if (content.length < MIN_BASE64_LENGTH_STANDALONE) {
    return content;
  }

  const parts: string[] = [];
  let lastEnd = 0;
  let runStart = -1;

  for (let i = 0; i <= content.length; i++) {
    const c = i < content.length ? content.charCodeAt(i) : -1;
    if (c >= 0 && c < 128 && isBase64Char[c]) {
      if (runStart === -1) {
        runStart = i;
      }
    } else if (runStart !== -1) {
      const runLen = i - runStart;
      if (runLen >= MIN_BASE64_LENGTH_STANDALONE) {
        let matchEnd = i;
        if (matchEnd < content.length && content.charCodeAt(matchEnd) === EQUALS_CHAR_CODE) {
          matchEnd++;
          if (matchEnd < content.length && content.charCodeAt(matchEnd) === EQUALS_CHAR_CODE) {
            matchEnd++;
          }
        }
        const base64String = content.substring(runStart, matchEnd);
        if (isLikelyBase64(base64String)) {
          parts.push(content.substring(lastEnd, runStart));
          parts.push(`${base64String.substring(0, TRUNCATION_LENGTH)}...`);
          lastEnd = matchEnd;
          i = matchEnd - 1;
        }
      }
      runStart = -1;
    }
  }

  if (lastEnd === 0) {
    return content;
  }

  parts.push(content.substring(lastEnd));
  return parts.join('');
};

/**
 * Fast pre-scan: check if content contains any run of base64 characters
 * at least MIN_BASE64_LENGTH_STANDALONE long.
 *
 * Two-phase approach:
 * 1. Find lines >= 256 chars via indexOf('\n') — most source code lines are
 *    well under 256 chars, so this skips the majority of content cheaply.
 * 2. Only scan the long lines with charCode checks for base64 characters.
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

  if (content.length - lineStart >= MIN_BASE64_LENGTH_STANDALONE) {
    if (scanLineForBase64(content, lineStart, content.length)) return true;
  }

  return false;
};

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
 * Truncates base64 encoded data in content to reduce file size.
 * Detects data URIs and standalone base64 strings.
 */
export const truncateBase64Content = (content: string): string => {
  let processedContent = content;
  if (content.includes('data:')) {
    dataUriPattern.lastIndex = 0;
    processedContent = content.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
      const preview = base64Data.substring(0, TRUNCATION_LENGTH);
      return `data:${mimeType}${params || ''};base64,${preview}...`;
    });
  }

  if (!hasLongBase64Run(processedContent)) {
    return processedContent;
  }

  processedContent = replaceStandaloneBase64(processedContent);

  return processedContent;
};

const isLikelyBase64 = (str: string): boolean => {
  if (!/^[A-Za-z0-9+/]+=*$/.test(str)) {
    return false;
  }

  const charSet = new Set(str);
  if (charSet.size < MIN_CHAR_DIVERSITY) {
    return false;
  }

  const hasNumbers = /[0-9]/.test(str);
  const hasUpperCase = /[A-Z]/.test(str);
  const hasLowerCase = /[a-z]/.test(str);
  const hasSpecialChars = /[+/]/.test(str);

  if (!hasNumbers) {
    return false;
  }

  const charTypeCount = [hasNumbers, hasUpperCase, hasLowerCase, hasSpecialChars].filter(Boolean).length;

  return charTypeCount >= MIN_CHAR_TYPE_COUNT;
};
