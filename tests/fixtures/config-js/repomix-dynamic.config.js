// Don't import defineConfig to avoid jiti transforming src/ files during tests
// This ensures stable coverage by preventing double instrumentation

// Use fixed timestamp to ensure deterministic test coverage
const timestamp = '2024-01-01T00-00-00';

export default {
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
  ignore: {
    customPatterns: ['**/node_modules/**'],
  },
};
