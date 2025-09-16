import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@theme-init/Root': resolve(__dirname, 'tests/mocks/RootStub.tsx'),
      '@docusaurus/useGlobalData': resolve(__dirname, 'tests/mocks/useGlobalData.ts'),
      '@mdx-js/react': resolve(__dirname, 'tests/mocks/mdx.tsx'),
      '@generated/docusaurus-plugin-linkify-med/default/registry': resolve(
        __dirname,
        'tests/mocks/generatedRegistry.ts'
      ),
    },
  },
});
