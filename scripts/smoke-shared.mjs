#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const rootDir = resolve(__dirname, '..');
export const pluginDir = join(rootDir, 'packages', 'docusaurus-plugin-smartlinker');
export const exampleDir = join(rootDir, 'examples', 'site');

export function runNpm(args, options = {}) {
  const { env: optionEnv, stdio = 'inherit', ...rest } = options;
  const env = {
    npm_config_loglevel: 'error',
    npm_config_progress: 'false',
    npm_config_fund: 'false',
    ...process.env,
    ...optionEnv,
  };
  execFileSync(npmBin, args, { stdio, ...rest, env });
}

export function runNpmJson(args, options = {}) {
  const output = execFileSync(npmBin, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
    env: {
      npm_config_loglevel: 'error',
      npm_config_progress: 'false',
      npm_config_fund: 'false',
      ...process.env,
      ...(options?.env ?? {}),
    },
  });
  const start = output.indexOf('[');
  const end = output.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Failed to parse npm --json output from: npm ${args.join(' ')}`);
  }
  return JSON.parse(output.slice(start, end + 1));
}

export function runPnpm(args, options = {}) {
  const { env: optionEnv, ...rest } = options;
  const env = { ...process.env, ...optionEnv };
  execFileSync('corepack', ['pnpm', ...args], { stdio: 'inherit', ...rest, env });
}

export function ensureBuilt() {
  console.log('▶ Building workspaces before smoke run...');
  runNpm(['run', 'build'], { cwd: rootDir });
}

export function packPlugin() {
  console.log('▶ Packing plugin tarball via npm pack...');
  const entries = runNpmJson(['pack', '--json'], { cwd: pluginDir });
  if (!entries.length || !entries[0]?.filename) {
    throw new Error('npm pack did not produce a filename');
  }
  return join(pluginDir, entries[0].filename);
}

export function createSmokeSandbox() {
  const tempDir = mkdtempSync(join(tmpdir(), 'smartlinker-smoke-'));
  const siteDir = join(tempDir, 'site');
  console.log(`▶ Copying example site into ${siteDir}`);
  cpSync(exampleDir, siteDir, {
    recursive: true,
    filter: (src) => {
      if (src === exampleDir) return true;
      const banned = [
        `${sep}node_modules${sep}`,
        `${sep}build${sep}`,
        `${sep}.docusaurus${sep}`,
      ];
      if (banned.some((token) => src.includes(token))) {
        return false;
      }
      return !src.endsWith(`${sep}node_modules`) && !src.endsWith(`${sep}build`) && !src.endsWith(`${sep}.docusaurus`);
    },
  });
  return { tempDir, siteDir };
}

export function addTarballDependency(siteDir, tarballPath) {
  const pkgPath = join(siteDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['docusaurus-plugin-smartlinker'] = `file:${tarballPath}`;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

export function stripWorkspaceSpecifier(siteDir) {
  const pkgPath = join(siteDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const current = pkg.dependencies?.['docusaurus-plugin-smartlinker'];
  if (typeof current === 'string' && current.startsWith('workspace:')) {
    delete pkg.dependencies['docusaurus-plugin-smartlinker'];
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

export function runNodeModuleAssertions(siteDir) {
  console.log('▶ Verifying import/require entrypoints...');
  execFileSync(process.execPath, ['--input-type=module', '-e', "await import('docusaurus-plugin-smartlinker'); await import('docusaurus-plugin-smartlinker/remark');"], {
    cwd: siteDir,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, ['-e', "require('docusaurus-plugin-smartlinker'); require('docusaurus-plugin-smartlinker/remark');"], {
    cwd: siteDir,
    stdio: 'inherit',
  });
}

export function cleanupSandbox({ tempDir }, tarballPath) {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
}

