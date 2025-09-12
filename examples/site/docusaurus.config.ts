import type { Config } from '@docusaurus/types';

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
  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        pages: {},
        theme: {
          
        },
      },
    ],
  ],
};

export default config;