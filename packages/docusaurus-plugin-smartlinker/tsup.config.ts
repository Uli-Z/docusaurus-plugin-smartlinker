import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'remark/index': 'src/remark/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: true
  },
  sourcemap: true,
  clean: true,
  bundle: true,
  splitting: false,
  external: [
    '@docusaurus/core',
    '@docusaurus/types',
    'react',
    'react-dom'
  ],
  treeshake: true,
  minify: false,
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs'
    };
  }
});
