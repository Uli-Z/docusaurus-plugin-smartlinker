import type { Config } from '@docusaurus/types';
import remarkLinkifyMed from 'remark-linkify-med';

function makeIndexProvider() {
  return {
    getAllTargets() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { registry } = require('@generated/docusaurus-plugin-linkify-med/registry');
        return Object.values(registry).map((e: any) => ({
          id: e.id,
          slug: e.slug,
          icon: e.icon,
          sourcePath: '',
          synonyms: e.synonyms || [],
        }));
      } catch {
        return [
          {
            id: 'amoxicillin',
            slug: '/antibiotics/amoxicillin',
            icon: '',
            sourcePath: '',
            synonyms: ['Amoxi'],
          },
        ];
      }
    },
    getCurrentFilePath(file: any) {
      return file.path || '';
    },
  };
}

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
  plugins: ['@linkify-med/docusaurus-plugin'],
  presets: [
    [
      'classic',
      {
        docs: {
          remarkPlugins: [() => remarkLinkifyMed({ index: makeIndexProvider() })],
        },
        blog: false,
        pages: {
          remarkPlugins: [() => remarkLinkifyMed({ index: makeIndexProvider() })],
        },
        theme: {},
      },
    ],
  ],
};

export default config;
