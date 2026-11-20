import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/testing/vitestSetup.ts'],
    // Before each test, restore every vi.spyOn() to its original method and clear the call
    // history of every mock. vi.fn(impl) doubles keep their implementation; mockReset stays off
    // so module-level doubles such as MockMcpServer keep working across tests.
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      include: ['src/**/*'],
      exclude: ['src/index.ts'],
      reporter: ['text', 'json', 'html'],
    },
    watch: false,
    testTimeout: 15000,
  },
});
