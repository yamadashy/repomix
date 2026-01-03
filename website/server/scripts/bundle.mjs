/**
 * Bundle script for website server
 *
 * Creates a production-ready bundle using Rolldown and collects WASM files.
 *
 * Usage: node scripts/bundle.mjs
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import { swc, defineRollupSwcOption } from 'rollup-plugin-swc3'

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distBundledDir = join(rootDir, 'dist-bundled');
const wasmDir = join(distBundledDir, 'wasm');

/**
 * Build TypeScript to JavaScript
 */
function buildTypeScript() {
  console.log('Building TypeScript...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

/**
 * Bundle with Rolldown
 */
async function bundleWithRolldown() {
  console.log('Bundling with Rolldown...');

  // ESM banner to provide CommonJS compatibility
  const banner = `
import { createRequire as _createRequire } from 'module';
const require = _createRequire(import.meta.url);
import { fileURLToPath as _fileURLToPath } from 'url';
import { dirname as _dirname } from 'path';
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);
`.trim();

  const build = await rolldown({
    input: join(rootDir, 'dist/index.js'),
    platform: 'node',
    external: ['tinypool', 'tiktoken'],
    plugins: [
      swc(defineRollupSwcOption({
        minify: true,
      })),
    ]
  });

  await build.write({
    dir: distBundledDir,
    format: 'esm',
    entryFileNames: 'server.mjs',
    inlineDynamicImports: true,
    banner,
    // Minification & optimization (equivalent to esbuild config)
    minify: true,
    minifyInternalExports: true,
    legalComments: 'inline',  // Rolldown only supports 'none' | 'inline'
  });

  console.log('Bundle created: dist-bundled/server.mjs');
}

/**
 * Collect tree-sitter WASM files from node_modules
 */
function collectWasmFiles() {
  console.log('Collecting WASM files...');

  // Create wasm directory
  if (!existsSync(wasmDir)) {
    mkdirSync(wasmDir, { recursive: true });
  }

  // Find and copy tree-sitter WASM files
  const treeSitterWasmsDir = join(rootDir, 'node_modules/@repomix/tree-sitter-wasms/out');

  if (existsSync(treeSitterWasmsDir)) {
    const wasmFiles = readdirSync(treeSitterWasmsDir).filter((f) => f.endsWith('.wasm'));

    for (const file of wasmFiles) {
      cpSync(join(treeSitterWasmsDir, file), join(wasmDir, file));
    }

    console.log(`Copied ${wasmFiles.length} WASM files to dist-bundled/wasm/`);
  } else {
    console.warn('Warning: tree-sitter-wasms not found');
  }
}

/**
 * Main bundle process
 */
async function main() {
  console.log('Starting bundle process...\n');

  buildTypeScript();
  await bundleWithRolldown();
  collectWasmFiles();

  console.log('\nBundle complete!');
}

main().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
