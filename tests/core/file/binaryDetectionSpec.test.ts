import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectFiles } from '../../../src/core/file/fileCollect.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Behavior-level regression tests for binary detection at the file-read layer.
//
// PR #1542 needed two follow-up fixes (`5ab82d51` mirroring isbinaryfile's PDF
// magic + suspicious-byte ratio rules, and `35e40fcd` replacing the JS NULL-byte
// loop with `Buffer.indexOf` SIMD scan) before the cheap pre-screen lined up
// with the full `isbinaryfile` check. Any future perf optimization that
// re-tweaks the binary fast-paths must keep these contracts:
//
//   - Binaries flagged by extension are skipped without reading content.
//   - Binaries flagged by content (NULL bytes; PDF-shaped buffers; non-UTF-8
//     binary payloads) are skipped before reaching the packed output.
//   - UTF-8 text — with or without BOM — is preserved and reaches the output.
//
// Fixtures deliberately mix extension-fast-path and content-detection-path
// cases. A perf change that accidentally trusts the extension and skips the
// content probe would let `payload.data` slip through; a change that
// over-rejects valid UTF-8 (including BOM-marked files) would drop `bom.ts`.

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_HEADER = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'binary');
const PDF_BINARY_TAIL = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x80, 0x81, 0x82, 0x83, 0xff, 0xfe, 0xfd, 0xfc]);
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

describe('binary detection spec', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-binary-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('skips binaries identified by extension (PNG) without including their bytes', async () => {
    await fs.writeFile(path.join(tmpDir, 'image.png'), Buffer.concat([PNG_MAGIC, Buffer.alloc(64, 0xff)]));
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal TypeScript source written to a fixture file
    await fs.writeFile(path.join(tmpDir, 'clean.ts'), 'export const greet = (n: string) => `hi ${n}`;\n');

    const { rawFiles, skippedFiles } = await collectFiles(['image.png', 'clean.ts'], tmpDir, createMockConfig());

    expect(rawFiles.map((f) => f.path)).toEqual(['clean.ts']);
    expect(skippedFiles.map((f) => f.path)).toContain('image.png');
    expect(skippedFiles.find((f) => f.path === 'image.png')?.reason).toBe('binary-extension');
  });

  // Content-detection path: a file whose extension does NOT hit `is-binary-path`
  // must still be rejected when its bytes are binary. A perf change that trusts
  // the extension alone — i.e. skips the NULL-byte probe or the isbinaryfile
  // fallback — would silently regress and let raw bytes into the LLM pack.
  it('skips binaries identified by NULL-byte content even when the extension looks innocuous', async () => {
    const nullBuffer = Buffer.from([0x68, 0x69, 0x00, 0x42, 0x59, 0x45]); // "hi\0BYE"
    await fs.writeFile(path.join(tmpDir, 'payload.data'), nullBuffer);
    await fs.writeFile(path.join(tmpDir, 'clean.ts'), 'export {};\n');

    const { rawFiles, skippedFiles } = await collectFiles(['payload.data', 'clean.ts'], tmpDir, createMockConfig());

    expect(rawFiles.map((f) => f.path)).toEqual(['clean.ts']);
    const skipped = skippedFiles.find((f) => f.path === 'payload.data');
    expect(skipped?.reason).toBe('binary-content');
  });

  // The PR #1542 case: `%PDF-…` header followed by non-UTF-8 binary bytes,
  // written with a non-binary extension so the extension fast-path doesn't
  // catch it. Must still be flagged via the UTF-8 decode failure → isbinaryfile
  // content check.
  it('skips PDF-shaped binaries even when the extension does not say so', async () => {
    await fs.writeFile(path.join(tmpDir, 'doc.data'), Buffer.concat([PDF_HEADER, PDF_BINARY_TAIL]));
    await fs.writeFile(path.join(tmpDir, 'clean.ts'), 'export {};\n');

    const { rawFiles, skippedFiles } = await collectFiles(['doc.data', 'clean.ts'], tmpDir, createMockConfig());

    expect(rawFiles.map((f) => f.path)).toEqual(['clean.ts']);
    expect(skippedFiles.find((f) => f.path === 'doc.data')?.reason).toBe('binary-content');
  });

  // Positive direction: UTF-8 text must NOT be classified as binary. The
  // current implementation has a fast UTF-8 path that bypasses `isbinaryfile`
  // entirely; a future optimization that swaps it for a different probe must
  // keep accepting plain text.
  it('keeps plain UTF-8 text', async () => {
    await fs.writeFile(path.join(tmpDir, 'plain.ts'), 'const sentinel = "PLAIN-UTF8-MARKER";\n');

    const { rawFiles, skippedFiles } = await collectFiles(['plain.ts'], tmpDir, createMockConfig());

    expect(rawFiles).toHaveLength(1);
    expect(rawFiles[0].content).toContain('PLAIN-UTF8-MARKER');
    expect(skippedFiles).toHaveLength(0);
  });

  // UTF-8 BOM is explicitly exempted from the NULL-byte probe (the rationale
  // is in fileRead.ts:103-106 — buffers like `EF BB BF 00 41` were treated as
  // text by isbinaryfile and we preserved parity). The BOM itself must be
  // stripped from the returned content; the rest of the text must survive.
  it('keeps UTF-8 text with BOM and strips the BOM from the returned content', async () => {
    const bomContent = Buffer.concat([UTF8_BOM, Buffer.from('export const x = "BOM-MARKER";\n', 'utf-8')]);
    await fs.writeFile(path.join(tmpDir, 'bom.ts'), bomContent);

    const { rawFiles, skippedFiles } = await collectFiles(['bom.ts'], tmpDir, createMockConfig());

    expect(rawFiles).toHaveLength(1);
    expect(rawFiles[0].content).toContain('BOM-MARKER');
    expect(rawFiles[0].content.startsWith('\ufeff')).toBe(false);
    expect(skippedFiles).toHaveLength(0);
  });
});
