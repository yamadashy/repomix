/**
 * Bundle script for website server
 *
 * Creates production-ready bundles using Rolldown and collects WASM files.
 * Generates two separate bundles:
 * - server.mjs: Full server bundle with all dependencies
 * - worker.mjs: Minimal worker bundle for tinypool workers
 *
 * Usage: node scripts/bundle.mjs
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distBundledDir = join(rootDir, 'dist-bundled');
const wasmDir = join(distBundledDir, 'wasm');

/**
 * Clean dist-bundled directory
 */
function cleanDistBundled() {
  console.log('Cleaning dist-bundled...');
  if (existsSync(distBundledDir)) {
    rmSync(distBundledDir, { recursive: true });
  }
  mkdirSync(distBundledDir, { recursive: true });
}

/**
 * Build TypeScript to JavaScript
 */
function buildTypeScript() {
  console.log('Building TypeScript...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

/**
 * Bundle server with Rolldown (full bundle with all server dependencies)
 */
async function bundleAll() {
  console.log('Bundling with code splitting...');

  const build = await rolldown({
    input: {
      server: join(rootDir, 'dist/index.js'),
      worker: join(rootDir, 'dist/worker-entry.js'),
    },
    platform: 'node',
    external: ['tinypool', 'tiktoken'],
  });

  await build.write({
    dir: distBundledDir,
    format: 'esm',
    entryFileNames: '[name].mjs',
    chunkFileNames: '[name]-[hash].mjs',
    // Note: No banner - Rolldown generates necessary shims via rolldown-runtime chunk
    minify: true,
    legalComments: 'inline',
    // Force code splitting with advancedChunks
    advancedChunks: {
      groups: [
        {
          name: 'shared',
          minSize: 100_000, // 100KB minimum for shared chunks
          minShareCount: 2, // Module must be used by at least 2 entry points
        },
      ],
    },
  });

  // Report bundle sizes
  const files = readdirSync(distBundledDir).filter((f) => f.endsWith('.mjs'));
  for (const file of files) {
    const size = getFileSizeMB(join(distBundledDir, file));
    console.log(`Bundle created: dist-bundled/${file} (${size} MB)`);
  }
}

/**
 * Get file size in MB
 */
function getFileSizeMB(filePath) {
  const stats = statSync(filePath);
  return (stats.size / 1024 / 1024).toFixed(2);
}

/**
 * Collect WASM files from node_modules
 */
function collectWasmFiles() {
  console.log('Collecting WASM files...');

  // Create wasm directory
  if (!existsSync(wasmDir)) {
    mkdirSync(wasmDir, { recursive: true });
  }

  // Copy web-tree-sitter.wasm to dist-bundled root
  // (web-tree-sitter looks for WASM file in the same directory as the JS file)
  const webTreeSitterWasm = join(rootDir, 'node_modules/web-tree-sitter/web-tree-sitter.wasm');
  if (existsSync(webTreeSitterWasm)) {
    cpSync(webTreeSitterWasm, join(distBundledDir, 'web-tree-sitter.wasm'));
    console.log('Copied web-tree-sitter.wasm to dist-bundled/');
  } else {
    console.warn('Warning: web-tree-sitter.wasm not found');
  }

  // Find and copy tree-sitter language WASM files
  const treeSitterWasmsDir = join(rootDir, 'node_modules/@repomix/tree-sitter-wasms/out');

  if (existsSync(treeSitterWasmsDir)) {
    const wasmFiles = readdirSync(treeSitterWasmsDir).filter((f) => f.endsWith('.wasm'));

    for (const file of wasmFiles) {
      cpSync(join(treeSitterWasmsDir, file), join(wasmDir, file));
    }

    console.log(`Copied ${wasmFiles.length} language WASM files to dist-bundled/wasm/`);
  } else {
    console.warn('Warning: tree-sitter-wasms not found');
  }
}

/**
 * Main bundle process
 */
async function main() {
  console.log('Starting bundle process...\n');

  cleanDistBundled();
  buildTypeScript();
  await bundleAll();
  collectWasmFiles();

  console.log('\nBundle complete!');
}

main().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
