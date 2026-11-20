import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { writeOutputToDisk } from '../../../src/core/packager/writeOutputToDisk.js';
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
