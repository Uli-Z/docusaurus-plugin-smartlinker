#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildExampleFromTarball,
  createTarball,
  repoRoot,
  verifyDistLayout,
} from './utils/package-verifier.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const runPnpm = (args) => {
  execFileSync('pnpm', args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: '1',
      npm_config_loglevel: 'error',
      npm_config_progress: 'false',
    },
  });
};

let packInfo;
let exampleInfo;

try {
  console.log('▶ Building workspaces before packing...');
  runPnpm(['run', 'build']);

  console.log('▶ Verifying dist layout...');
  verifyDistLayout({ rootDir: repoRoot });

  console.log('▶ Packing repository with pnpm pack...');
  packInfo = createTarball({ rootDir: repoRoot });

  console.log(`▶ Installing tarball into example site from ${packInfo.tarballPath}`);
  exampleInfo = buildExampleFromTarball({ tarballPath: packInfo.tarballPath });

  console.log('\n✔ Git install smoke test succeeded. Build output located at:', join(exampleInfo.siteDir, 'build'));
} finally {
  exampleInfo?.cleanup?.();
  packInfo?.cleanup?.();
}
