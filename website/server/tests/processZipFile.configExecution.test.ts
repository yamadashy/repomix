import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { runDefaultAction } from 'repomix';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { processZipFile } from '../src/domains/pack/processZipFile.js';

// GHSA-j7x8-v4ww-w74f. Nothing is mocked here: the real pack pipeline runs
// against a real archive, so this fails if the guarantee is lost anywhere along
// the chain — not only if processZipFile stops passing the flag.
//
// The payload writes a marker file. Any observable side effect would do; a file
// is used because it survives the module being imported in a child of this
// process and is trivially asserted on.

const buildPayloadConfig = (markerPath: string) => `import { writeFileSync } from 'node:fs';
writeFileSync(${JSON.stringify(markerPath)}, 'executed');
export default {};
`;

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

describe('processZipFile — uploaded repomix.config.* is never executed', () => {
  let workDir: string;
  let markerPath: string;
  let originalCwd: string;

  beforeAll(async () => {
    // processZipFile writes its output file into process.cwd(); keep that out of
    // the repository even if a test fails before the cleanup runs.
    originalCwd = process.cwd();
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-zip-config-test-'));
    process.chdir(workDir);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(workDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    markerPath = path.join(workDir, `marker-${Math.random().toString(36).slice(2)}`);
  });

  afterEach(async () => {
    await fs.rm(markerPath, { force: true });
  });

  test('packs an archive containing repomix.config.js without running it', async () => {
    const zipped = zipSync({
      'repomix.config.js': strToU8(buildPayloadConfig(markerPath)),
      'README.md': strToU8('payload archive\n'),
    });

    const { result } = await processZipFile(
      new File([zipped], 'payload.zip', { type: 'application/zip' }),
      'plain',
      {},
    );

    expect(await exists(markerPath)).toBe(false);
    // The pack itself must still succeed — the fix skips the config, it does not
    // reject the upload, so a user who zips a project that legitimately contains
    // a JS config keeps getting their output.
    expect(result.content).toContain('payload archive');
  });

  test('the same payload does execute without skipLocalConfig', async () => {
    // Positive control. Without this, the assertion above would keep passing if
    // the payload silently stopped being a valid config, or if config discovery
    // stopped finding a file at the root of the packed directory — leaving a
    // green test that no longer tests anything.
    const targetDir = await fs.mkdtemp(path.join(workDir, 'control-'));
    await fs.writeFile(path.join(targetDir, 'repomix.config.js'), buildPayloadConfig(markerPath));
    await fs.writeFile(path.join(targetDir, 'README.md'), 'payload archive\n');

    await runDefaultAction([targetDir], targetDir, {
      output: path.join(targetDir, 'out.txt'),
      style: 'plain',
      securityCheck: true,
      quiet: true,
    });

    expect(await exists(markerPath)).toBe(true);
  });
});
