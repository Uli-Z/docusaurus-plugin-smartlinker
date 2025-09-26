#!/usr/bin/env node
import { join } from 'node:path';
import {
  addTarballDependency,
  cleanupSandbox,
  createSmokeSandbox,
  ensureBuilt,
  packPlugin,
  runNodeModuleAssertions,
  runNpm,
} from './smoke-shared.mjs';

let sandbox;
let tarballPath;

try {
  ensureBuilt();
  tarballPath = packPlugin();
  sandbox = createSmokeSandbox();
  addTarballDependency(sandbox.siteDir, tarballPath);

  console.log('▶ Installing dependencies via npm...');
  runNpm(['install'], { cwd: sandbox.siteDir });

  runNodeModuleAssertions(sandbox.siteDir);

  console.log('▶ Running docusaurus build (npm run build)...');
  runNpm(['run', 'build'], {
    cwd: sandbox.siteDir,
    env: {
      DOCUSAURUS_PLUGIN_DEBUG: '0',
      DOCUSAURUS_PLUGIN_DEBUG_LEVEL: 'warn',
    },
  });

  console.log(`\n✔ npm smoke test succeeded. Build output located at: ${join(sandbox.siteDir, 'build')}`);
} finally {
  cleanupSandbox(sandbox ?? {}, tarballPath);
}
