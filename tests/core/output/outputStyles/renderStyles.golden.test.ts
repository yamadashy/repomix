/**
 * Golden tests for the output style renderers.
 *
 * Each case renders a fixed `RenderContext` (see `goldenRenderContexts.ts`) and
 * compares the whole result with a file under `fixtures/`, so any change to the
 * layout — a blank line between sections, a separator, a heading, a value that
 * starts being escaped — fails here even when every section still "contains" the
 * right text.
 *
 * The renderers are compared as they return, before `generateOutput` trims the
 * result and appends the final newline. The expected files were first generated
 * when the Handlebars templates were replaced by these render functions, and were
 * checked against what the Handlebars templates produced for the same contexts:
 * identical once that trim is applied (the old templates only differed by a
 * leading newline).
 *
 * Changing the output on purpose:
 *   1. Run `npx vitest run tests/core/output/outputStyles/renderStyles.golden.test.ts -u`.
 *   2. Read the changed files under `fixtures/` in the diff and confirm they are
 *      the output you want. Never update them blindly: a changed expected file is
 *      a user-visible output change and must be reviewed like code.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { RenderContext } from '../../../../src/core/output/outputGeneratorTypes.js';
import { renderMarkdownStyle } from '../../../../src/core/output/outputStyles/markdownStyle.js';
import { renderPlainStyle } from '../../../../src/core/output/outputStyles/plainStyle.js';
import { renderXmlStyle } from '../../../../src/core/output/outputStyles/xmlStyle.js';
import { goldenRenderContexts } from './goldenRenderContexts.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const renderers: ReadonlyArray<{ extension: string; render: (context: RenderContext) => string }> = [
  { extension: 'xml', render: renderXmlStyle },
  { extension: 'md', render: renderMarkdownStyle },
  { extension: 'txt', render: renderPlainStyle },
];

describe('output style renderers (golden)', () => {
  for (const [caseName, context] of Object.entries(goldenRenderContexts)) {
    for (const { extension, render } of renderers) {
      test(`${caseName}.${extension}`, async () => {
        await expect(render(context)).toMatchFileSnapshot(path.join(fixturesDir, `${caseName}.${extension}`));
      });
    }
  }
});
