import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
});
