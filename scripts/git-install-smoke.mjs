#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = (command, options = {}) => {
  const { env: optionEnv, ...rest } = options;
  const env = { ...process.env, ...optionEnv };
  execSync(command, { stdio: 'inherit', ...rest, env });
};

const runJsonArray = (command, options = {}) => {
  const { env: optionEnv, ...rest } = options;
  const env = { ...process.env, ...optionEnv };
  const raw = execSync(command, { stdio: 'pipe', encoding: 'utf8', ...rest, env });
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Failed to parse JSON output from command: ${command}`);
  }
  const jsonSlice = raw.slice(start, end + 1);
  return JSON.parse(jsonSlice);
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const exampleDir = join(rootDir, 'examples', 'site');
const pluginDir = join(rootDir, 'packages', 'docusaurus-plugin-smartlinker');

let tarballPath;
let tempDir;

try {
  console.log('▶ Building workspaces before packing...');
  run('npm run build', { cwd: rootDir, env: { npm_config_loglevel: 'error', npm_config_progress: 'false' } });

  console.log('▶ Packing plugin package...');
  const packEntries = runJsonArray('npm pack --json', { cwd: pluginDir, env: { npm_config_loglevel: 'error', npm_config_progress: 'false' } });
  if (packEntries.length === 0) {
    throw new Error('npm pack did not return a filename');
  }
  tarballPath = join(pluginDir, packEntries[0].filename);

  tempDir = mkdtempSync(join(tmpdir(), 'smartlinker-smoke-'));
  const siteDir = join(tempDir, 'site');
  console.log(`▶ Copying example site to ${siteDir}`);
  cpSync(exampleDir, siteDir, {
    recursive: true,
    filter: (src) => {
      if (src === exampleDir) {
        return true;
      }
      const disallowed = [
        `${sep}node_modules${sep}`,
        `${sep}build${sep}`,
        `${sep}.docusaurus${sep}`,
      ];
      if (disallowed.some((token) => src.includes(token))) {
        return false;
      }
      return !src.endsWith(`${sep}node_modules`) && !src.endsWith(`${sep}build`) && !src.endsWith(`${sep}.docusaurus`);
    },
  });

  const pkgPath = join(siteDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['docusaurus-plugin-smartlinker'] = `file:${tarballPath}`;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log('▶ Installing dependencies via npm...');
  run('npm install', {
    cwd: siteDir,
    env: { npm_config_loglevel: 'error', npm_config_progress: 'false', npm_config_fund: 'false' },
  });

  console.log('▶ Running docusaurus build in smoke environment...');
  run('npm run build', { cwd: siteDir, env: { npm_config_loglevel: 'error', npm_config_progress: 'false' } });

  console.log('\n✔ Git install smoke test succeeded. Build output located at:', join(siteDir, 'build'));
} finally {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
}
