import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { readRawFile } from '../../../src/core/file/fileRead.js';

describe('readRawFile', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'fileRead');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  test('should read normal HTML file successfully', async () => {
    const filePath = path.join(testDir, 'normal.html');
    const content = '<html><body>Hello World</body></html>';
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read HTML file with Thymeleaf syntax successfully', async () => {
    const filePath = path.join(testDir, 'thymeleaf.html');
    const content =
      '<html lang="en" xmlns:th="http://www.thymeleaf.org" xmlns:layout="http://www.ultraq.net.nz/thymeleaf/layout" layout:decorate="~{layouts/er_default_hayan}"></html>';
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read HTML file with various Thymeleaf expressions', async () => {
    const filePath = path.join(testDir, 'complex-thymeleaf.html');
    const content = `<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
  <head>
    <title th:text="~{common/head :: title}">Title</title>
  </head>
  <body>
    <div th:insert="~{fragments/header :: header}"></div>
    <div th:replace="~{fragments/nav :: navigation}"></div>
    <main>
      <p th:text="~{messages :: welcome}">Welcome message</p>
    </main>
  </body>
</html>`;
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should skip file if it exceeds size limit', async () => {
    const filePath = path.join(testDir, 'large.txt');
    const content = 'x'.repeat(1000);
    await fs.writeFile(filePath, content, 'utf-8');

    const result = await readRawFile(filePath, 100);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('size-limit');
  });

  test('should skip actual binary file by extension', async () => {
    const filePath = path.join(testDir, 'test.jpg');
    // Create a fake binary file
    const binaryData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
    await fs.writeFile(filePath, binaryData);

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('binary-extension');
  });

  test('should skip actual binary content', async () => {
    const filePath = path.join(testDir, 'test.txt');
    // Create file with binary content that should be detected as binary
    const binaryData = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) {
      binaryData[i] = i;
    }
    await fs.writeFile(filePath, binaryData);

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('binary-content');
  });

  test('should handle file reading errors gracefully', async () => {
    const nonExistentPath = path.join(testDir, 'does-not-exist.txt');

    const result = await readRawFile(nonExistentPath, 1024);

    expect(result.content).toBeNull();
    expect(result.skippedReason).toBe('encoding-error');
  });

  test('should handle ASCII file with low jschardet confidence', async () => {
    const filePath = path.join(testDir, 'ascii-low-confidence.txt');
    // Pure ASCII content that might have low confidence in jschardet
    const content = 'Simple ASCII text without special characters';
    await fs.writeFile(filePath, content, 'ascii');

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read BOM-less UTF-8 file successfully', async () => {
    const filePath = path.join(testDir, 'utf8-no-bom.html');
    const content = '<html>UTF-8 without BOM</html>';
    // Write without BOM
    await fs.writeFile(filePath, content, { encoding: 'utf-8' });

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content);
    expect(result.skippedReason).toBeUndefined();
  });

  test('should read UTF-8 file with BOM successfully', async () => {
    const filePath = path.join(testDir, 'utf8-with-bom.html');
    const content = '<html>UTF-8 with BOM</html>';
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const contentBuffer = Buffer.from(content, 'utf-8');
    const fileBuffer = Buffer.concat([bom, contentBuffer]);

    await fs.writeFile(filePath, fileBuffer);

    const result = await readRawFile(filePath, 1024);

    expect(result.content).toBe(content); // BOM should be stripped
    expect(result.skippedReason).toBeUndefined();
  });
});
