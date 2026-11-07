// Characters XML 1.0 forbids anywhere in a document, even as character references
// (https://www.w3.org/TR/xml/#charsets): C0 controls other than tab, LF and CR,
// unpaired surrogates and the noncharacters U+FFFE and U+FFFF. Unicode-aware, so a
// well-formed surrogate pair is one code point and only a lone half matches.
/* oxlint-disable no-control-regex -- see the biome-ignore comment below */
const INVALID_XML_CHARS_RE =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point of this sanitizer
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF￾￿]/gu;
/* oxlint-enable no-control-regex */

/**
 * Replaces each character that XML 1.0 cannot represent with U+FFFD, so parsable
 * XML output stays well-formed when a packed file contains, say, a form feed or
 * an ANSI escape sequence. Replacing rather than dropping keeps the gap visible
 * and leaves the surrounding text where it was.
 */
export const replaceInvalidXmlChars = (text: string): string => text.replace(INVALID_XML_CHARS_RE, '�');

// fast-xml-builder value hook: values are strings except for the odd number or Date.
export const replaceInvalidXmlCharsInValue = (_name: string, value: unknown): unknown =>
  typeof value === 'string' ? replaceInvalidXmlChars(value) : value;
