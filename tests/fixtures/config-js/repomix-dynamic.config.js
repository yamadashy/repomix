import { defineConfig } from '../../../src/index.js';

const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

export default defineConfig({
  output: {
    filePath: `output-${timestamp}.xml`,
    style: 'xml',
  },
  ignore: {
    customPatterns: ['**/node_modules/**'],
  },
});
