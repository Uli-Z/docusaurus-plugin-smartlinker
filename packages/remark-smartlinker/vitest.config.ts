import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginDistEntry = join(__dirname, '..', 'docusaurus-plugin-smartlinker', 'dist', 'index.js');

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      'docusaurus-plugin-smartlinker': pluginDistEntry,
    },
  },
});
