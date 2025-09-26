#!/usr/bin/env node
import { join } from 'node:path';
import {
  addTarballDependency,
  cleanupSandbox,
  createSmokeSandbox,
  ensureBuilt,
  packPlugin,
  runNodeModuleAssertions,
  runPnpm,
  stripWorkspaceSpecifier,
} from './smoke-shared.mjs';

let sandbox;
let tarballPath;

try {
  ensureBuilt();
  tarballPath = packPlugin();
  sandbox = createSmokeSandbox();
  stripWorkspaceSpecifier(sandbox.siteDir);
  addTarballDependency(sandbox.siteDir, tarballPath);

  console.log('▶ Adding packed plugin via pnpm add...');
  runPnpm(['add', tarballPath], { cwd: sandbox.siteDir });

  runNodeModuleAssertions(sandbox.siteDir);

  console.log('▶ Running docusaurus build (pnpm run build)...');
  runPnpm(['run', 'build'], {
    cwd: sandbox.siteDir,
    env: {
      DOCUSAURUS_PLUGIN_DEBUG: '0',
      DOCUSAURUS_PLUGIN_DEBUG_LEVEL: 'warn',
    },
  });

  console.log(`\n✔ pnpm smoke test succeeded. Build output located at: ${join(sandbox.siteDir, 'build')}`);
} finally {
  cleanupSandbox(sandbox ?? {}, tarballPath);
}
