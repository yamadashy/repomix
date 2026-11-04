/**
 * Golden tests for `parseFile` (the `--compress` output).
 *
 * Each input under `fixtures/<lang>/` is a real source file. Its full expected
 * output lives next to it as `<name>.<ext>.expected` and is compared with
 * `toMatchFileSnapshot`, so any change to the compressed output (removed or
 * leaked bodies, duplicated chunks, `⋮----` separators, ordering) fails here.
 *
 * Adding a case:
 *   1. Drop a source file into `fixtures/<lang>/` (the directory name must match
 *      the language detected from the file extension, e.g. `c_sharp` for `.cs`).
 *   2. Run `npx vitest run tests/core/treeSitter/parseFile.golden.test.ts -u`
 *      to create its `.expected` file.
 *   3. Read the generated `.expected` file in the diff and confirm it is the
 *      output you want. Never update snapshots with `-u` blindly: a changed
 *      expected file is a behaviour change and must be reviewed like code.
 *
 * All fixtures run with the default config: parse strategies do not read the
 * config, so there is no per-case config override.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { getLanguageConfigByExtension } from '../../../src/core/treeSitter/languageConfig.js';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const EXPECTED_SUFFIX = '.expected';

const allFiles = fs
  .readdirSync(fixturesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((langDir) =>
    fs.readdirSync(path.join(fixturesDir, langDir.name)).map((fileName) => ({ lang: langDir.name, fileName })),
  )
  .sort((a, b) => `${a.lang}/${a.fileName}`.localeCompare(`${b.lang}/${b.fileName}`));

const fixtures = allFiles.filter(({ fileName }) => !fileName.endsWith(EXPECTED_SUFFIX));

describe('parseFile golden fixtures', () => {
  test('fixtures are discovered', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  test('every expected file has a matching input', () => {
    const inputs = new Set(fixtures.map(({ lang, fileName }) => `${lang}/${fileName}`));
    const orphans = allFiles
      .filter(({ fileName }) => fileName.endsWith(EXPECTED_SUFFIX))
      .map(({ lang, fileName }) => `${lang}/${fileName.slice(0, -EXPECTED_SUFFIX.length)}`)
      .filter((input) => !inputs.has(input));
    expect(orphans).toEqual([]);
  });

  test.each(fixtures)('$lang/$fileName', async ({ lang, fileName }) => {
    const inputPath = path.join(fixturesDir, lang, fileName);

    // Guard against fixtures placed in the wrong language directory
    expect(getLanguageConfigByExtension(path.extname(fileName).slice(1))?.name).toBe(lang);

    const content = fs.readFileSync(inputPath, 'utf8');
    const result = await parseFile(content, fileName, createMockConfig());

    expect(typeof result).toBe('string');
    // parseFile trims its output; append a newline so expected files end with one
    await expect(`${result}\n`).toMatchFileSnapshot(`${inputPath}${EXPECTED_SUFFIX}`);
  });
});
