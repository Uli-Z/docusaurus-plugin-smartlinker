import type { Config } from '@docusaurus/types';
import remarkLinkifyMed from '../../packages/remark-linkify-med/dist/index.js';
import { createFsIndexProvider } from '@linkify-med/docusaurus-plugin';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const linkifyIndex = createFsIndexProvider({
  roots: [join(__dirname, 'docs')],
  slugPrefix: '/docs',
});

const config: Config = {
  title: 'Linkify-Med Example',
  favicon: 'img/favicon.ico',
  url: 'https://example.com',
  baseUrl: '/',
  organizationName: 'linkify-med',
  projectName: 'example',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  themes: [
    [
      '@docusaurus/theme-classic',
      {
        customCss: join(__dirname, 'src/theme/customTheme.css'),
      },
    ],
  ],
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'default',
        path: join(__dirname, 'docs'),
        routeBasePath: 'docs',
        sidebarPath: join(__dirname, 'sidebars.ts'),
        remarkPlugins: [[remarkLinkifyMed, { index: linkifyIndex }]],
      },
    ],
    [
      '@docusaurus/plugin-content-pages',
      {
        path: join(__dirname, 'src/pages'),
        remarkPlugins: [[remarkLinkifyMed, { index: linkifyIndex }]],
      },
    ],
    ['@linkify-med/docusaurus-plugin', {
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
