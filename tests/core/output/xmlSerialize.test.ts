import { describe, expect, test } from 'vitest';
import { serializeXml } from '../../../src/core/output/xmlSerialize.js';

// Expected strings below were confirmed against fast-xml-builder 1.3.1 with `{ ignoreAttributes: false }`,
// the library this serializer replaced.
describe('serializeXml', () => {
  describe('escaping', () => {
    const special = `& < > " '`;
    const escaped = '&amp; &lt; &gt; &quot; &apos;';

    test('escapes the five special characters in text content', () => {
      expect(serializeXml({ r: { '#text': special } })).toBe(`<r>${escaped}</r>`);
    });

    test('escapes the five special characters in child element values', () => {
      expect(serializeXml({ r: { a: special } })).toBe(`<r><a>${escaped}</a></r>`);
    });

    test('escapes the five special characters in attribute values', () => {
      expect(serializeXml({ r: { '@_p': special, '#text': 'x' } })).toBe(`<r p="${escaped}">x</r>`);
    });

    test('escapes the ampersand of existing entities instead of keeping them', () => {
      expect(serializeXml({ r: { a: '&amp; &lt; &#x41;' } })).toBe('<r><a>&amp;amp; &amp;lt; &amp;#x41;</a></r>');
    });

    test('passes everything else through untouched', () => {
      expect(serializeXml({ r: { a: ']]> <![CDATA[x]]>\r\n\t\u0001\u{1F600}\ud800 é' } })).toBe(
        '<r><a>]]&gt; &lt;![CDATA[x]]&gt;\r\n\t\u0001\u{1F600}\ud800 é</a></r>',
      );
    });
  });

  describe('omitted and empty values', () => {
    test('omits undefined values', () => {
      expect(serializeXml({ r: { a: undefined, b: 'x' } })).toBe('<r><b>x</b></r>');
    });

    test('emits an empty string as an empty, non-self-closing element', () => {
      expect(serializeXml({ r: { a: '' } })).toBe('<r><a></a></r>');
    });

    test('emits an element with only empty or undefined text as an empty element', () => {
      expect(serializeXml({ r: { '#text': '' } })).toBe('<r></r>');
      expect(serializeXml({ r: { '#text': undefined } })).toBe('<r></r>');
      expect(serializeXml({ r: { a: {} } })).toBe('<r><a></a></r>');
    });

    test('omits an empty array', () => {
      expect(serializeXml({ r: { a: [] } })).toBe('<r></r>');
    });

    test('stringifies numbers and booleans, keeping the sign of negative zero', () => {
      expect(serializeXml({ r: { a: 1.5, b: -0, c: true, d: false, e: Number.NaN } })).toBe(
        '<r><a>1.5</a><b>-0</b><c>true</c><d>false</d><e>NaN</e></r>',
      );
    });
  });

  describe('attributes', () => {
    test('keeps empty attribute values', () => {
      expect(serializeXml({ r: { '@_p': '', '#text': 'x' } })).toBe('<r p="">x</r>');
    });

    test('omits undefined attributes', () => {
      expect(serializeXml({ r: { '@_p': undefined, '#text': 'x' } })).toBe('<r>x</r>');
    });

    // fast-xml-builder emitted `<r p>` here, which is not well-formed XML
    test('keeps the value of an attribute whose value is "true"', () => {
      expect(serializeXml({ r: { '@_p': 'true', '#text': 'x' } })).toBe('<r p="true">x</r>');
      expect(serializeXml({ r: { '@_p': true, '#text': 'x' } })).toBe('<r p="true">x</r>');
    });

    test('keeps attributes on the start tag wherever they appear in the object', () => {
      expect(serializeXml({ r: { a: 'x', '@_id': '1', '#text': 'T' } })).toBe('<r id="1"><a>x</a>T</r>');
    });

    test('keeps an empty element with attributes open and closed', () => {
      expect(serializeXml({ r: { '#text': '', '@_p': 'v' } })).toBe('<r p="v"></r>');
    });
  });

  describe('arrays', () => {
    test('repeats the element for each item and skips undefined items', () => {
      expect(serializeXml({ r: { a: ['x', '', undefined, 'y'] } })).toBe('<r><a>x</a><a></a><a>y</a></r>');
    });

    test('serializes arrays of objects with text and attributes', () => {
      expect(
        serializeXml({
          r: {
            f: [
              { '#text': 'a', '@_path': 'p1' },
              { '#text': '', '@_path': 'p2' },
            ],
          },
        }),
      ).toBe('<r><f path="p1">a</f><f path="p2"></f></r>');
    });

    test('serializes arrays of text-only objects', () => {
      expect(serializeXml({ r: { files: [{ '#text': 'a&b' }, { '#text': '' }] } })).toBe(
        '<r><files>a&amp;b</files><files></files></r>',
      );
    });
  });

  describe('text and children', () => {
    test('emits text and children in the order of the keys', () => {
      expect(serializeXml({ r: { '#text': 'T', a: 'x' } })).toBe('<r>T<a>x</a></r>');
      expect(serializeXml({ r: { a: 'x', '#text': 'T' } })).toBe('<r><a>x</a>T</r>');
      expect(serializeXml({ r: { a: 'x', '#text': 'T', b: 'y' } })).toBe('<r><a>x</a>T<b>y</b></r>');
    });

    test('serializes nested elements without indentation or newlines', () => {
      expect(serializeXml({ r: { a: { b: { '#text': 'x' } } } })).toBe('<r><a><b>x</b></a></r>');
    });
  });

  test('serializes a whole parsable document', () => {
    expect(
      serializeXml({
        repomix: {
          file_summary: { '#text': 'H & <h>', purpose: 'p' },
          user_provided_header: undefined,
          directory_structure: 'a\nb',
          files: {
            '#text': "This section contains the repository's files.",
            file: [{ '#text': 'x\r\n"y"', '@_path': 'a&b.ts' }],
          },
          git_diffs: { git_diff_work_tree: undefined, git_diff_staged: '' },
          git_logs: { git_log_commit: [{ date: 'd', message: 'm<', files: [{ '#text': 'f1' }] }] },
          instruction: undefined,
        },
      }),
    ).toBe(
      '<repomix><file_summary>H &amp; &lt;h&gt;<purpose>p</purpose></file_summary><directory_structure>a\nb</directory_structure><files>This section contains the repository&apos;s files.<file path="a&amp;b.ts">x\r\n&quot;y&quot;</file></files><git_diffs><git_diff_staged></git_diff_staged></git_diffs><git_logs><git_log_commit><date>d</date><message>m&lt;</message><files>f1</files></git_log_commit></git_logs></repomix>',
    );
  });
});
