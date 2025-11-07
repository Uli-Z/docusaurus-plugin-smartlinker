import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const mdxProcessorEntry = require.resolve(
  '@docusaurus/mdx-loader/lib/processor.js'
);

export default defineConfig({
  test: {
    // Use forks on newer Node.js versions in environments where worker pools are flaky
    pool: Number(process.versions.node.split('.')[0]) >= 22 ? 'forks' : 'threads',
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@theme-init/Root': resolve(__dirname, 'tests/mocks/RootStub.tsx'),
      '@docusaurus/useGlobalData': resolve(__dirname, 'tests/mocks/useGlobalData.ts'),
      '@docusaurus/useBaseUrl': resolve(__dirname, 'tests/mocks/useBaseUrl.ts'),
      '@mdx-js/react': resolve(__dirname, 'tests/mocks/mdx.tsx'),
      '@theme/ThemedImage': resolve(__dirname, 'tests/mocks/ThemedImage.tsx'),
      '@generated/docusaurus-plugin-smartlinker/default/registry': resolve(
        __dirname,
        'tests/mocks/generatedRegistry.ts'
      ),
      '@generated/docusaurus-plugin-smartlinker/default/tooltipComponents': resolve(
        __dirname,
        'tests/mocks/generatedTooltipComponents.ts'
      ),
      '@docusaurus/mdx-loader/lib/processor.js': mdxProcessorEntry,
    },
  },
});
