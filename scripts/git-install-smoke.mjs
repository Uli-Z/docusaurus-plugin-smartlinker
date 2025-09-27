#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const runPnpm = (args, options = {}) => {
  const { env: optionEnv, stdio = 'inherit', ...rest } = options;
  const env = { ...process.env, ...optionEnv };
  return execFileSync('pnpm', args, { stdio, ...rest, env });
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const exampleDir = join(rootDir, 'examples', 'site');

let tarballPath;
let tempDir;
let packDir;

try {
  console.log('▶ Building workspaces before packing...');
  runPnpm(['build'], { cwd: rootDir });

  console.log('▶ Packing repository...');
  packDir = mkdtempSync(join(tmpdir(), 'smartlinker-pack-'));
  const packOutput = runPnpm(['pack', '--pack-destination', packDir], {
    cwd: rootDir,
    stdio: 'pipe',
    env: { ...process.env },
  });
  const packLines = packOutput.toString('utf8').trim().split(/\r?\n/).filter(Boolean);
  if (packLines.length === 0) {
    throw new Error('pnpm pack did not return a filename');
  }
  tarballPath = join(packDir, packLines[packLines.length - 1]);

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
  const relativeTarball = `file:${relative(siteDir, tarballPath)}`;
  pkg.dependencies['docusaurus-plugin-smartlinker'] = relativeTarball;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log('▶ Installing dependencies via pnpm...');
  runPnpm(['install'], { cwd: siteDir });

  console.log('▶ Running docusaurus build in smoke environment...');
  runPnpm(['run', 'build'], { cwd: siteDir, env: { CI: '1' } });

  console.log('\n✔ Git install smoke test succeeded. Build output located at:', join(siteDir, 'build'));
} finally {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
  if (packDir) {
    rmSync(packDir, { recursive: true, force: true });
  }
}
