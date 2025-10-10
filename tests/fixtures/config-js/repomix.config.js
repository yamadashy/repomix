import { defineConfig } from '../../../src/index.js';

export default defineConfig({
  output: {
    filePath: 'esm-output.xml',
    style: 'xml',
    removeComments: true,
  },
  ignore: {
    customPatterns: ['**/node_modules/**', '**/dist/**'],
  },
});
