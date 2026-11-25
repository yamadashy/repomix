import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';

// fs.writeFile encodes the whole string into one Buffer before writing, which for a
// large output means a full UTF-8 copy next to the string itself. Outputs longer
// than this many UTF-16 code units are instead encoded and written a slice at a
// time through one reused buffer (4M code units encode to at most 12 MB).
const WRITE_CHUNK_CHARS = 4 * 1024 * 1024;

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

// Yields the UTF-8 encoding of `content` a slice at a time, every slice encoded
// into the same buffer. The consumer must finish with each yielded view before
// pulling the next one, which fs.writeFile does for iterables.
function* encodeInChunks(content: string, chunkChars: number): Generator<Buffer> {
  // A chunk is at most chunkChars + 1 code units, each at most 3 UTF-8 bytes.
  const buffer = Buffer.allocUnsafe((chunkChars + 1) * 3);
  let start = 0;
  while (start < content.length) {
    let end = Math.min(start + chunkChars, content.length);
    // Never split a surrogate pair: encoded separately, each half would become
    // U+FFFD instead of the character. Lone surrogates encode the same either way.
    if (isHighSurrogate(content.charCodeAt(end - 1)) && isLowSurrogate(content.charCodeAt(end))) {
      end++;
    }
    const byteLength = buffer.write(content.slice(start, end), 0, 'utf8');
    yield buffer.subarray(0, byteLength);
    start = end;
  }
}

// Same bytes, flags, mode and error handling as fs.writeFile(filePath, content),
// since it is still fs.writeFile that opens, writes and closes the file.
export const writeStringToFile = async (
  filePath: string,
  content: string,
  chunkChars: number = WRITE_CHUNK_CHARS,
): Promise<void> => {
  await fs.writeFile(filePath, content.length <= chunkChars ? content : encodeInChunks(content, chunkChars));
};

// Write output to file or stdout
export const writeOutputToDisk = async (output: string, config: RepomixConfigMerged): Promise<undefined> => {
  // Write to stdout
  if (config.output.stdout === true) {
    process.stdout.write(output);
    return;
  }

  // Normal case: write to file
  const outputPath = path.resolve(config.cwd, config.output.filePath);
  logger.trace(`Writing output to: ${outputPath}`);

  // Create output directory if it doesn't exist
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await writeStringToFile(outputPath, output);
};
