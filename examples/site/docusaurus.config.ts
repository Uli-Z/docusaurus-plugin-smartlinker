import type { Config } from '@docusaurus/types';
import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';
import { createFsIndexProvider } from 'docusaurus-plugin-smartlinker';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const [repoOwner = 'Uli-Z'] =
  process.env.GITHUB_REPOSITORY?.split('/') ?? [];
const repoName = 'docusaurus-plugin-smartlinker';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const siteUrl = process.env.SITE_URL ?? (isGithubActions ? `https://${repoOwner}.github.io` : 'http://localhost:3000');

const ensureSlashes = (value: string) => {
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
};

const normalizedBaseUrl = (() => {
  if (process.env.SITE_BASE_URL) {
    return ensureSlashes(process.env.SITE_BASE_URL);
  }

  if (isGithubActions && repoName) {
    return ensureSlashes(`/${repoName}`);
  }

  return '/';
})();

const SmartlinkerIndex = createFsIndexProvider({
  roots: [join(__dirname, 'docs')],
  slugPrefix: '/docs',
});

const config: Config = {
  title: 'Smartlinker Example',
  favicon: 'img/favicon.ico',
  url: siteUrl,
  baseUrl: normalizedBaseUrl,
  organizationName: repoOwner,
  projectName: repoName,
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
          remarkPlugins: [[remarkSmartlinker, { index: SmartlinkerIndex }]],
        },
        blog: false,
        pages: {
          remarkPlugins: [[remarkSmartlinker, { index: SmartlinkerIndex }]],
        },
        theme: {
          customCss: join(__dirname, 'src/css/custom.css'),
        },
      },
    ],
  ],
  plugins: [
    ['docusaurus-plugin-smartlinker', {
      icons: {
        pill: 'emoji:💊',
        bug: '/img/bug.svg',
      },
      darkModeIcons: {
        bug: '/img/bug-dark.svg',
      },
      tooltipComponents: {
        DrugTip: '@site/src/components/DrugTip',
      },
    }]
  ],
};

export default config;
