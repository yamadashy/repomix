import { createWriteStream, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';

// Cache the last written output size per path to skip redundant disk writes.
// On warm MCP/server runs where file content hasn't changed, the output is
// identical and re-writing 3-5MB to disk wastes ~10ms of I/O.
// Validated by total byte count — if the content changes, the length almost
// certainly changes too (even a single character edit shifts all offsets).
let _lastWrittenCache: { outputPath: string; totalBytes: number } | undefined;

const computeOutputBytes = (output: string | string[]): number => {
  if (Array.isArray(output)) {
    let total = 0;
    for (const part of output) total += part.length;
    return total;
  }
  return output.length;
};

// Write output to file or stdout.
// Accepts string[] (from native renderers) to avoid the 3-5MB join allocation.
// For string[], uses a WriteStream where stream.write() is synchronous when the
// kernel buffer isn't full (true for 3-5MB), avoiding per-part async overhead.
export const writeOutputToDisk = async (output: string | string[], config: RepomixConfigMerged): Promise<undefined> => {
  // Write to stdout
  if (config.output.stdout === true) {
    if (Array.isArray(output)) {
      for (const part of output) {
        process.stdout.write(part);
      }
    } else {
      process.stdout.write(output);
    }
    return;
  }

  // Normal case: write to file
  const outputPath = path.resolve(config.cwd, config.output.filePath);
  logger.trace(`Writing output to: ${outputPath}`);

  // Skip disk write if the output has the same character count as the last write to this path.
  // On warm MCP/server runs with unchanged files, the output is identical.
  // Verify the file still exists on disk to guard against external deletion.
  const totalChars = computeOutputBytes(output);
  if (_lastWrittenCache && _lastWrittenCache.outputPath === outputPath && _lastWrittenCache.totalBytes === totalChars) {
    try {
      statSync(outputPath);
      logger.trace('Skipping disk write: output unchanged');
      return;
    } catch {
      // File doesn't exist or stat failed — fall through to write
    }
  }

  // Create output directory if it doesn't exist
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (Array.isArray(output)) {
    // Write parts via a WriteStream without joining into one contiguous string.
    // stream.write() buffers synchronously when the kernel write buffer isn't full
    // (highWaterMark default 64KB; our total is 3-5MB but each write is small).
    // This avoids the ~6000 async handle.write() round-trips that caused 200ms+ overhead.
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(outputPath);
      stream.on('error', reject);
      stream.on('finish', resolve);
      for (const part of output) {
        stream.write(part);
      }
      stream.end();
    });
  } else {
    await fs.writeFile(outputPath, output);
  }

  _lastWrittenCache = { outputPath, totalBytes: totalChars };
};
