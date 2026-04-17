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

const isBase64CharCode = (c: number): boolean => {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47;
};

const replaceStandaloneBase64 = (content: string): string => {
  if (content.length < MIN_BASE64_LENGTH_STANDALONE) {
    return content;
  }

  const parts: string[] = [];
  let lastEnd = 0;
  let runStart = -1;

  for (let i = 0; i <= content.length; i++) {
    if (i < content.length && isBase64CharCode(content.charCodeAt(i))) {
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
 * Truncates base64 encoded data in content to reduce file size.
 * Detects data URIs and standalone base64 strings.
 */
export const truncateBase64Content = (content: string): string => {
  // Reset lastIndex since patterns are global and reused across calls
  dataUriPattern.lastIndex = 0;

  let processedContent = content;

  processedContent = processedContent.replace(dataUriPattern, (_match, mimeType, params, base64Data) => {
    const preview = base64Data.substring(0, TRUNCATION_LENGTH);
    return `data:${mimeType}${params || ''};base64,${preview}...`;
  });

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
