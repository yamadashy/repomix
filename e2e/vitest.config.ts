import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Separate config for the out-of-process sandbox e2e tests. They are NOT part of
// the default `npm run test` suite (which globs tests/**) because they require a
// prior `npm run build` (they drive the built bin/ + lib/) and spawn real
// kernel-sandboxed processes. CI runs them explicitly after build:
//   node --run test-e2e
export default defineConfig({
  // Anchor to the repo root (this config's parent dir) so the include glob resolves
  // no matter which directory vitest is invoked from.
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    environment: 'node',
    include: ['e2e/**/*.test.ts'],
    watch: false,
    // Sandbox startup (landstrip helper spawn + confined re-exec) + a full pack can be slow.
    testTimeout: 60000,
    hookTimeout: 60000,
    // One MCP server / sandboxed child at a time.
    fileParallelism: false,
  },
});
