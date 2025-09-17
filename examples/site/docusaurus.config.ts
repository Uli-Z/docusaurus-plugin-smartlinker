import type { Config } from '@docusaurus/types';
import remarkLinkifyMed from '../../packages/remark-linkify-med/dist/index.js';
import { createFsIndexProvider } from 'docusaurus-plugin-smartlinker';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const linkifyIndex = createFsIndexProvider({
  roots: [join(__dirname, 'docs')],
  slugPrefix: '/docs',
});

const config: Config = {
  title: 'Smartlinker Example',
  favicon: 'img/favicon.ico',
  url: 'https://example.com',
  baseUrl: '/',
  organizationName: 'smartlinker',
  projectName: 'example',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.ts'),
          remarkPlugins: [[remarkLinkifyMed, { index: linkifyIndex }]],
        },
        blog: false,
        pages: {
          remarkPlugins: [[remarkLinkifyMed, { index: linkifyIndex }]],
        },
        theme: {},
      },
    ],
  ],
  plugins: [
    ['docusaurus-plugin-smartlinker', {
      icons: {
        pill: 'emoji:💊',
        bug: '/img/bug.svg',
      },
      tooltipComponents: {
        DrugTip: '@site/src/components/DrugTip',
      },
    }]
  ],
};

export default config;
