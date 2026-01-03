/**
 * Warmup script for Node.js compile cache generation.
 *
 * This script is executed during Docker build to pre-generate V8 compile cache.
 * By loading all modules at build time, subsequent cold starts will use
 * the cached compiled code, reducing startup latency.
 *
 * @see https://nodejs.org/api/module.html#moduleenablecompilecachedir
 */

import { enableCompileCache, flushCompileCache } from 'node:module';

// Enable compile cache (uses NODE_COMPILE_CACHE env var for directory)
enableCompileCache();

// Set warmup mode to prevent server from actually starting
process.env.WARMUP_MODE = 'true';

// Import the server module to trigger compilation of all dependencies
await import('./dist-bundled/server.mjs');

// Flush cache to disk immediately (default is on process exit)
flushCompileCache();

console.log('Compile cache generated successfully');

// Explicitly exit the process
// Some modules (like winston/logging) may keep the event loop alive
process.exit(0);
