import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import iconv from 'iconv-lite';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { readRawFile } from '../../../src/core/file/fileRead.js';

describe('readRawFile', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-fileRead-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should read normal text file successfully', async () => {
    const filePath = path.join(testDir, 'normal.txt');
    const content = 'Hello World';
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read file with low jschardet confidence (Issue #869)', async () => {
    // This tests that files with low confidence scores from jschardet
    // are NOT skipped if they contain valid UTF-8 content
    const filePath = path.join(testDir, 'server.py');
    const content = `import json
import time
import uuid

def hello():
    print("Hello, World!")
`;
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read HTML file with Thymeleaf syntax (Issue #847)', async () => {
    // This tests that HTML files with special syntax like Thymeleaf (~{})
    // are NOT skipped even if jschardet returns low confidence
    const filePath = path.join(testDir, 'thymeleaf.html');
    const content = '<html lang="en" xmlns:th="http://www.thymeleaf.org" layout:decorate="~{layouts/default}"></html>';
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read empty file successfully', async () => {
    // Empty files should not be skipped (jschardet may return 0 confidence for empty files)
    const filePath = path.join(testDir, '__init__.py');
    await fs.writeFile(filePath, '', 'utf-8');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe('');
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read file containing legitimate U+FFFD character', async () => {
    // This tests that files with intentional U+FFFD characters in the source
    // are NOT skipped (TextDecoder can decode them successfully)
    const filePath = path.join(testDir, 'with-replacement-char.txt');
    // U+FFFD is a valid Unicode character that can appear in source files
    const content = 'Some text with replacement char: \uFFFD and more text';
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should skip file with actual decode errors (U+FFFD)', async () => {
    const filePath = path.join(testDir, 'invalid.txt');
    // Create a file with a UTF-8 BOM followed by valid text and invalid UTF-8 sequences
    // The BOM forces UTF-8 detection, and the invalid sequence will produce U+FFFD
    const utf8Bom = Buffer.from([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    const validText = 'Hello World\n'.repeat(50);
    // Invalid UTF-8: 0x80 is a continuation byte without a leading byte
    const invalidSequence = Buffer.from([0x80, 0x81, 0x82]);
    const buffer = Buffer.concat([utf8Bom, Buffer.from(validText), invalidSequence, Buffer.from(validText)]);
    await fs.writeFile(filePath, buffer);

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('encoding-error');
  });

  test('should skip file if it exceeds size limit', async () => {
    const filePath = path.join(testDir, 'large.txt');
    const content = 'x'.repeat(1000);
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 100);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('size-limit');
  });

  test('should skip binary file by extension', async () => {
    const filePath = path.join(testDir, 'test.jpg');
    const binaryData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    await fs.writeFile(filePath, binaryData);

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('binary-extension');
  });

  test('should skip binary content in text extension file', async () => {
    const filePath = path.join(testDir, 'binary.txt');
    // Create file with binary content (null bytes and control characters)
    const binaryData = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) {
      binaryData[i] = i;
    }
    await fs.writeFile(filePath, binaryData);

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('binary-content');
  });

  test('should read valid UTF-8 multi-byte file without invoking isBinaryFile', async () => {
    // Regression: prior to the UTF-8-first reorder, certain valid-UTF-8
    // byte patterns triggered an O(n) protobuf-detector loop inside
    // `isbinaryfile` that could spend seconds and ultimately throw
    // `Invalid array length` (concrete trigger:
    // `website/client/src/ko/guide/tips/best-practices.md`). The throw was
    // caught by `readRawFile`'s outer try/catch and the file was silently
    // dropped as `encoding-error`. After the reorder, valid UTF-8 with no
    // NULL bytes must round-trip as text content without ever invoking
    // `isBinaryFile`.
    const filePath = path.join(testDir, 'korean.md');
    // Korean Hangul syllables encode as 3-byte UTF-8 sequences (0xE0-0xEF
    // lead bytes followed by two 0x80-0xBF continuation bytes); none of
    // those bytes are NULL.
    const content = `${'안녕하세요 '.repeat(200)}\n`; // ~3.6 KB of multi-byte UTF-8
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should not classify UTF-8 BOM file as binary even when followed by NULL', async () => {
    // Regression: `isbinaryfile@5.0.2`'s `isBinaryCheck` short-circuits to
    // "not binary" the moment it sees a UTF-8 BOM (`EF BB BF`), so a buffer
    // like `EF BB BF 00 41` was packed as text before this PR. The cheap
    // NULL-byte probe must mirror that exemption so this case keeps reaching
    // the UTF-8 fast path instead of being newly skipped on the embedded NULL.
    const filePath = path.join(testDir, 'utf8-bom-with-null.txt');
    const utf8Bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from([0x00, 0x41]); // U+0000 then 'A'
    await fs.writeFile(filePath, Buffer.concat([utf8Bom, body]));

    const result = await readRawFile(filePath, 1024);

    expect(result.skippedReason).toBeUndefined();
    expect(result.content).toBe('\0A');
  });

  test('should read Shift-JIS source instead of dropping it as binary (Issue #1878)', async () => {
    // `isbinaryfile` decides from at most 512 bytes and counts every high byte
    // that is not part of a UTF-8 sequence as suspicious, so double-byte text
    // scores ~100% suspicious and always comes back binary. Legacy-encoded
    // source must still reach the jschardet + iconv path and be packed decoded.
    const filePath = path.join(testDir, 'Big.java');
    const text = `// こんにちは世界\n${'// データベース接続を初期化して、クエリを実行します。\npublic void processOrder(int id){ repo.save(new Order(id, "注文")); }\n'.repeat(30)}`;
    await fs.writeFile(filePath, iconv.encode(text, 'shift_jis'));

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.skippedReason).toBeUndefined();
    expect(result.content).toBe(text);
  });

  test('should read EUC-KR text instead of dropping it as binary (Issue #1878)', async () => {
    const filePath = path.join(testDir, 'euckr.txt');
    const text = '안녕하세요 세계\n'.repeat(10);
    await fs.writeFile(filePath, iconv.encode(text, 'euc-kr'));

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.skippedReason).toBeUndefined();
    expect(result.content).toBe(text);
  });

  test('should read GBK text instead of dropping it as binary (Issue #1878)', async () => {
    const filePath = path.join(testDir, 'gbk.txt');
    const text = '你好世界，这是一个测试文件\n'.repeat(10);
    await fs.writeFile(filePath, iconv.encode(text, 'gbk'));

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.skippedReason).toBeUndefined();
    expect(result.content).toBe(text);
  });

  test('should still skip a real binary whose bytes decode without U+FFFD', async () => {
    // Counterpart to the legacy-encoding tests: accepting decoded text must not
    // let binaries through. A single-byte codepage maps every byte to some
    // character, so this payload decodes "cleanly" and is rejected only by the
    // control-character density of the decoded text.
    const filePath = path.join(testDir, 'payload.data');
    // No NULL byte (that is handled by the earlier probe) and not valid UTF-8,
    // so classification happens entirely on the slow path. jschardet settles on
    // windows-1252, which maps every byte, so the decode produces no U+FFFD —
    // only the control-character density of the decoded text rejects it.
    const binary = Buffer.from(
      Array.from({ length: 800 }, (_, i) => (i % 2 ? 0xc0 + (i % 0x30) : ((i * 5) % 0x1f) + 1)),
    );
    await fs.writeFile(filePath, binary);

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('binary-content');
  });

  test('should skip legacy-encoded text carrying an XML-invalid C0 control', async () => {
    // U+0001 is unrepresentable in XML 1.0, just like the NULL byte the earlier
    // probe rejects. A single one is far below any density threshold, so it has
    // to be rejected outright rather than averaged away, otherwise it reaches
    // the default XML output unescaped and breaks downstream parsers.
    const filePath = path.join(testDir, 'sjis-with-control.txt');
    const text = `${'こんにちは世界、これはテストです。\n'.repeat(20)}\u0001`;
    await fs.writeFile(filePath, iconv.encode(text, 'shift_jis'));

    const result = await readRawFile(filePath, 1024 * 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('binary-content');
  });

  test('should decode UTF-16 LE BOM file despite embedded NULL bytes', async () => {
    // Regression: the cheap NULL-byte binary probe ahead of the UTF-8 try
    // would misclassify UTF-16/UTF-32 text files (whose ASCII characters
    // encode with NULL high bytes) as binary. The probe must be skipped
    // when the buffer starts with a UTF-16/UTF-32 BOM so jschardet+iconv
    // can decode the file on the slow path, matching pre-change behavior.
    const filePath = path.join(testDir, 'utf16le.txt');
    // UTF-16 LE BOM (FF FE) followed by "Hello\n" encoded as 2 bytes/char.
    const utf16LeBom = Buffer.from([0xff, 0xfe]);
    const utf16LeBody = Buffer.from('Hello\n', 'utf16le');
    await fs.writeFile(filePath, Buffer.concat([utf16LeBom, utf16LeBody]));

    const result = await readRawFile(filePath, 1024);

    expect(result.skippedReason).toBeUndefined();
    expect(result.content).toBe('Hello\n');
  });
});
