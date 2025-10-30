// Don't import defineConfig to avoid jiti transforming src/ files during tests
// This ensures stable coverage by preventing double instrumentation
export default {
  output: {
    filePath: 'mjs-output.xml',
    style: 'xml',
  },
  ignore: {
    customPatterns: ['**/test/**'],
  },
};
