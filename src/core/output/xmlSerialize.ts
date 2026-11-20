// Minimal XML serializer for the `--parsable-style` XML output.
//
// It reproduces what fast-xml-builder 1.3.1 emitted for this input shape with
// `{ ignoreAttributes: false }` and otherwise default options, so that the output stays unchanged,
// with one deliberate difference: fast-xml-builder dropped the value of an attribute whose value
// was the string "true" (a file named `true` came out as `<file path>`, which is not well-formed).
// Attributes always keep their value here. The rules:
//   - keys starting with `@_` are attributes, the `#text` key is text content, every other key is a
//     child element; an array value repeats the element once per item
//   - text and attribute values escape & > < ' " (as &amp; &gt; &lt; &apos; &quot;), including the
//     `&` of an existing entity such as `&amp;`; nothing else is touched (control characters,
//     `]]>` and lone surrogates are emitted as is, so the result is not guaranteed to be well-formed)
//   - `undefined` values and `undefined` array items are omitted, and so is an empty array
//   - an empty string yields an empty element (`<a></a>`), never a self-closing one
//   - text and children are emitted in key order, attributes always go on the start tag
//   - there is no XML declaration, indentation or newline

export type XmlValue = string | number | boolean | undefined;

type XmlItem = XmlValue | XmlElement;

export interface XmlElement {
  [key: string]: XmlItem | readonly XmlItem[];
}

const TEXT_KEY = '#text';
const ATTRIBUTE_PREFIX = '@_';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '>': '&gt;',
  '<': '&lt;',
  "'": '&apos;',
  '"': '&quot;',
};

const escapeXml = (value: string): string => value.replace(/[&><'"]/g, (char) => ESCAPES[char]);

// String(-0) is '0'; the library keeps the sign
const primitiveToString = (value: string | number | boolean): string =>
  typeof value === 'number' && Object.is(value, -0) ? '-0' : String(value);

const isElement = (value: XmlItem): value is XmlElement => typeof value === 'object';

const serializeAttribute = (name: string, value: string | number | boolean): string =>
  ` ${name}="${escapeXml(primitiveToString(value))}"`;

const serializeItem = (name: string, item: XmlItem): string => {
  if (item === undefined) {
    return '';
  }
  if (!isElement(item)) {
    return `<${name}>${escapeXml(primitiveToString(item))}</${name}>`;
  }

  // `{ '#text': undefined }` is not special-cased: it yields the same empty element
  const { attributes, content } = serializeContent(item);
  return `<${name}${attributes}>${content}</${name}>`;
};

const serializeContent = (element: XmlElement): { attributes: string; content: string } => {
  let attributes = '';
  let content = '';

  for (const [key, value] of Object.entries(element)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value as readonly XmlItem[]) {
        content += serializeItem(key, item);
      }
    } else if (key === TEXT_KEY) {
      // Only primitive text is supported; repomix never produces anything else here
      if (!isElement(value as XmlItem)) {
        content += escapeXml(primitiveToString(value as string | number | boolean));
      }
    } else if (key.startsWith(ATTRIBUTE_PREFIX)) {
      if (!isElement(value as XmlItem)) {
        attributes += serializeAttribute(key.slice(ATTRIBUTE_PREFIX.length), value as string | number | boolean);
      }
    } else {
      content += serializeItem(key, value as XmlItem);
    }
  }

  return { attributes, content };
};

export const serializeXml = (document: XmlElement): string => serializeContent(document).content;
