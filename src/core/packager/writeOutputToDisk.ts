import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';

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
};
