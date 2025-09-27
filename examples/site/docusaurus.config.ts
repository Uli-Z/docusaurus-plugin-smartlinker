import type { Config } from '@docusaurus/types';
import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';
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

type DebugLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const resolveDebugLevel = (): DebugLevel => {
  const envLevelRaw = process.env.DOCUSAURUS_PLUGIN_DEBUG_LEVEL?.trim();
  if (envLevelRaw) {
    const envLevel = envLevelRaw.toLowerCase();
    if (['error', 'warn', 'info', 'debug', 'trace'].includes(envLevel)) {
      return envLevel as DebugLevel;
    }
  }

  if (process.env.CI === 'true' || process.env.NODE_ENV === 'test') {
    return 'error';
  }

  return 'trace';
};

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
          remarkPlugins: [remarkSmartlinker],
        },
        blog: false,
        pages: {
          remarkPlugins: [remarkSmartlinker],
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
      folders: [
        {
          path: 'docs',
          defaultIcon: 'pill',
          // Demo mapping: make a React component available inside MDX short notes
          tooltipComponents: {
            DrugTip: '@site/src/components/DrugTip',
          },
        },
      ],
      debug: {
        enabled: true,
        level: resolveDebugLevel(),
      },
    }]
  ],
};

export default config;
