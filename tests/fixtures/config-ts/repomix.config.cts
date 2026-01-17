// Don't import defineConfig to avoid jiti transforming src/ files during tests
// This ensures stable coverage by preventing double instrumentation
module.exports = {
  output: {
    filePath: 'cts-output.xml',
    style: 'plain',
  },
  ignore: {
    customPatterns: ['**/build/**'],
  },
};
