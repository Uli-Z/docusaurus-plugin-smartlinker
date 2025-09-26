#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);
const pluginDir = join(rootDir, 'packages', 'docusaurus-plugin-smartlinker');

const run = (command, options = {}) => {
  const { env: envOverrides, ...rest } = options;
  const env = { ...process.env, ...envOverrides };
  execSync(command, { stdio: 'inherit', ...rest, env });
};

const runJson = (command, options = {}) => {
  const { env: envOverrides, ...rest } = options;
  const env = { ...process.env, ...envOverrides };
  const output = execSync(command, { stdio: 'pipe', encoding: 'utf8', ...rest, env });
  const match = output.match(/\[\s*\{/);
  const start = match && typeof match.index === 'number' ? match.index : -1;
  const end = output.lastIndexOf(']');
  if (start === -1) {
    throw new Error(`Failed to locate JSON payload in output: ${output}`);
  }
  if (end === -1 || end <= start) {
    throw new Error(`Failed to parse JSON output from command: ${command}`);
  }
  return JSON.parse(output.slice(start, end + 1));
};

let tarballPath;
let tempDir;

try {
  console.log('▶ Building plugin before smoke test...');
  run('npm run build', { cwd: rootDir, env: { npm_config_loglevel: 'error', npm_config_progress: 'false' } });

  console.log('▶ Packing plugin tarball...');
  const packInfo = runJson('npm pack --json', {
    cwd: pluginDir,
    env: { npm_config_loglevel: 'error', npm_config_progress: 'false' },
  });
  if (!Array.isArray(packInfo) || packInfo.length === 0) {
    throw new Error('npm pack did not return metadata.');
  }
  tarballPath = join(pluginDir, packInfo[0].filename);

  tempDir = mkdtempSync(join(tmpdir(), 'smartlinker-npm-smoke-'));
  const siteDir = join(tempDir, 'smartlinker-smoke');

  console.log('▶ Scaffolding fresh Docusaurus site...');
  run(
    'npx --yes create-docusaurus@latest smartlinker-smoke classic --skip-install --git-strategy copy --package-manager npm --typescript',
    {
      cwd: tempDir,
      env: { npm_config_loglevel: 'error', npm_config_progress: 'false', npm_config_yes: 'true' },
    }
  );

  console.log('▶ Wiring plugin into scaffolded site...');
  const pkgPath = join(siteDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['docusaurus-plugin-smartlinker'] = `file:${tarballPath}`;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  const configPath = join(siteDir, 'docusaurus.config.ts');
  const configContent = `import type { Config } from '@docusaurus/types';
import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';

const config: Config = {
  title: 'Smartlinker Smoke',
  url: 'https://example.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'smartlinker-smoke',
  projectName: 'smartlinker-smoke',
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkSmartlinker],
        },
        blog: false,
        pages: {
          remarkPlugins: [remarkSmartlinker],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  plugins: [
    [
      'docusaurus-plugin-smartlinker',
      {
        folders: [
          {
            path: 'docs',
            tooltipComponents: {},
          },
        ],
      },
    ],
  ],
};

export default config;
`;
  writeFileSync(configPath, configContent);

  const docPath = join(siteDir, 'docs', 'intro.md');
  const doc = readFileSync(docPath, 'utf8');
  const enhancedDoc = doc.replace(
    '---',
    `---\nsmartlink-terms:\n  - Welcome\nsmartlink-short-note: |\n  Welcome to Smartlinker smoke test.\n  \n`
  );
  writeFileSync(docPath, enhancedDoc);

  console.log('▶ Installing dependencies via npm...');
  run('npm install', {
    cwd: siteDir,
    env: { npm_config_loglevel: 'error', npm_config_progress: 'false', npm_config_fund: 'false' },
  });

  console.log('▶ Building scaffolded site...');
  run('npm run build', {
    cwd: siteDir,
    env: { npm_config_loglevel: 'error', npm_config_progress: 'false' },
  });

  console.log('\n✔ npm smoke test succeeded.');
} finally {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
}
