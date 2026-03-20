#!/usr/bin/env node

// https://nodejs.org/api/module.html#module-compile-cache
// Enable compile cache for the main process and propagate the cache directory
// via NODE_COMPILE_CACHE env var so child_process workers inherit it at startup
// (before any modules are loaded), which is critical for ESM static imports.
const nodeModule = require('node:module');
if (nodeModule.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    const result = nodeModule.enableCompileCache();
    if (result && result.directory && !process.env.NODE_COMPILE_CACHE) {
      process.env.NODE_COMPILE_CACHE = result.directory;
    }
  } catch {
    // Ignore errors
  }
}

const nodeVersion = process.versions.node;
const [major] = nodeVersion.split('.').map(Number);

const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
};

if (major < 20) {
  console.warn(
    `Warning: Repomix recommends Node.js version 20 or higher. Current version: ${nodeVersion}. Some features may not work as expected.\n`,
  );
}

function setupErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(EXIT_CODES.ERROR);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
    process.exit(EXIT_CODES.ERROR);
  });

  function shutdown() {
    process.exit(EXIT_CODES.SUCCESS);
  }

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down...');
    shutdown();
  });
  process.on('SIGTERM', shutdown);
}

(async () => {
  try {
    setupErrorHandlers();

    const { run } = await import('../lib/cli/cliRun.js');
    await run();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Fatal Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('Fatal Error:', error);
    }

    process.exit(EXIT_CODES.ERROR);
  }
})();
