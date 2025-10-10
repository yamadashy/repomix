import { defineConfig } from '../../../src/index.js';

export default defineConfig({
  output: {
    filePath: 'mjs-output.xml',
    style: 'xml',
  },
  ignore: {
    customPatterns: ['**/test/**'],
  },
});
