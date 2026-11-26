import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { writeOutputToDisk, writeStringToFile } from '../../../src/core/packager/writeOutputToDisk.js';
import { createTempDir } from '../../testing/tempDir.js';

describe('writeOutputToDisk', () => {
  let originalStdoutWrite: typeof process.stdout.write;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('repomix-write-output-');
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = vi.fn();
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
  });

  it('should write output to the specified file path', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      cwd: tempDir,
      output: { filePath: 'output.txt' },
    } as RepomixConfigMerged;

    const outputPath = path.resolve(config.cwd, config.output.filePath);

    await writeOutputToDisk(output, config);

    await expect(fs.readFile(outputPath, 'utf8')).resolves.toBe(output);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it('should write to stdout if stdout is true', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      cwd: tempDir,
      output: { stdout: true },
    } as RepomixConfigMerged;

    await writeOutputToDisk(output, config);

    await expect(fs.readdir(tempDir)).resolves.toEqual([]);
    expect(process.stdout.write).toHaveBeenCalledWith(output);
  });
});

describe('writeStringToFile', () => {
  const CHUNK_CHARS = 5;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('repomix-write-string-');
  });

  // Writes `content` with a tiny chunk size and with fs.writeFile, and returns both files' bytes.
  const writeBoth = async (content: string, chunkChars = CHUNK_CHARS) => {
    const chunkedPath = path.join(tempDir, 'chunked.txt');
    const referencePath = path.join(tempDir, 'reference.txt');
    await writeStringToFile(chunkedPath, content, chunkChars);
    await fs.writeFile(referencePath, content);
    return { actual: await fs.readFile(chunkedPath), expected: await fs.readFile(referencePath) };
  };

  const emoji = '\ud83d\ude00';
  const cases: [string, string][] = [
    ['empty', ''],
    ['one-byte only', 'abcdefghijklmnopqrstuvwxyz0123456789'],
    ['two-byte (non-Latin-1) text', 'あいうえおかきくけこさしすせそ'.repeat(3)],
    ['Latin-1 text', '\u00e9\u00e8\u00ff'.repeat(10)],
    ['just below the chunk size', 'a'.repeat(CHUNK_CHARS - 1)],
    ['exactly the chunk size', 'a'.repeat(CHUNK_CHARS)],
    ['just above the chunk size', 'a'.repeat(CHUNK_CHARS + 1)],
    ['a multiple of the chunk size', 'a'.repeat(CHUNK_CHARS * 4)],
    ['lone high surrogate at a chunk end', `abcd\ud83dxyz${'a'.repeat(10)}`],
    ['lone high surrogate as the last unit', `abcdefgh\ud83d`],
    ['lone low surrogate at a chunk start', `abcde\ude00xyz${'a'.repeat(10)}`],
    ['lone high surrogate followed by a pair across a chunk end', `abcd\ud83d${emoji}${'a'.repeat(10)}`],
    ['reversed pair across a chunk end', `abcd\ude00\ud83d${'a'.repeat(10)}`],
    ['only surrogate pairs', emoji.repeat(20)],
    ['only lone high surrogates', '\ud83d'.repeat(20)],
  ];
  // A surrogate pair starting at every offset across several chunk ends.
  for (let offset = 0; offset < CHUNK_CHARS * 3; offset++) {
    cases.push([`pair at offset ${offset}`, `${'a'.repeat(offset)}${emoji}${'b'.repeat(CHUNK_CHARS * 2)}`]);
  }

  it.each(cases)('writes the same bytes as fs.writeFile: %s', async (_, content) => {
    const { actual, expected } = await writeBoth(content);
    expect(actual.equals(expected)).toBe(true);
  });

  it('writes the same bytes as fs.writeFile for random strings with every chunk size', async () => {
    const alphabet = ['a', '\n', '\u00e9', 'あ', emoji, '\ud83d', '\ude00', '\u0000', '\ufeff'];
    let seed = 1;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let round = 0; round < 200; round++) {
      let content = '';
      const length = Math.floor(random() * 40);
      for (let i = 0; i < length; i++) content += alphabet[Math.floor(random() * alphabet.length)];
      const { actual, expected } = await writeBoth(content, 1 + (round % 7));
      expect(actual.equals(expected), JSON.stringify(content)).toBe(true);
    }
  });

  it('truncates a longer existing file', async () => {
    const filePath = path.join(tempDir, 'existing.txt');
    await fs.writeFile(filePath, 'x'.repeat(1000));
    await writeStringToFile(filePath, 'short content', CHUNK_CHARS);
    await expect(fs.readFile(filePath, 'utf8')).resolves.toBe('short content');
  });

  it('rejects with the same error as fs.writeFile when the target is a directory', async () => {
    const reference = await fs.writeFile(tempDir, 'abcdefghij').catch((error: unknown) => error);
    const actual = await writeStringToFile(tempDir, 'abcdefghij', CHUNK_CHARS).catch((error: unknown) => error);
    expect(actual).toBeInstanceOf(Error);
    expect(actual).toEqual(reference);
    expect((actual as NodeJS.ErrnoException).code).toBe((reference as NodeJS.ErrnoException).code);
  });
});
