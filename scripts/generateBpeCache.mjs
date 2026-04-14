/**
 * Pre-generate BPE rank data as JSON for faster worker thread initialization.
 *
 * The default gpt-tokenizer BPE rank modules (e.g., o200k_base.js) are 2.2 MB
 * JS files containing ~200K string literals. V8's JS parser takes ~200ms to
 * evaluate each one. By pre-serializing the data as JSON and loading it with
 * JSON.parse at runtime, worker initialization drops to ~23ms — an 8-9x
 * speedup per worker thread.
 *
 * This script runs as part of `npm run build` after TypeScript compilation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'lib', 'core', 'metrics', 'data');

const encodings = ['o200k_base', 'cl100k_base', 'p50k_base', 'r50k_base'];

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  for (const encoding of encodings) {
    const { resolveEncodingAsync } = await import('gpt-tokenizer/resolveEncodingAsync');
    const bpe = await resolveEncodingAsync(encoding);
    const jsonPath = path.join(dataDir, `${encoding}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(bpe));
    const size = fs.statSync(jsonPath).size;
    console.log(`Generated ${encoding}.json (${(size / 1024).toFixed(0)} KB, ${bpe.length} entries)`);
  }
}

main().catch((err) => {
  console.error('Failed to generate BPE cache:', err);
  process.exit(1);
});
