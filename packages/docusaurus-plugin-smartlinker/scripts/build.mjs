import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = dirname(__dirname);
const distDir = join(packageDir, 'dist');

const require = createRequire(import.meta.url);
const tscBin = require.resolve('typescript/bin/tsc');

const runTsc = (project) => {
  execFileSync(process.execPath, [tscBin, '-p', project], {
    cwd: packageDir,
    stdio: 'inherit'
  });
};

console.log('[build] Clean dist directory');
rmSync(distDir, { recursive: true, force: true });

console.log('[build] Compile plugin sources');
runTsc('tsconfig.json');

console.log('[build] Compile remark helper (ES modules)');
runTsc('tsconfig.remark.json');

console.log('[build] Compile remark helper (CommonJS)');
runTsc('tsconfig.remark.cjs.json');

console.log('[build] Generate remark CommonJS bundles');
execFileSync(process.execPath, [join(__dirname, 'remark-build-cjs.mjs')], {
  cwd: packageDir,
  stdio: 'inherit'
});

console.log('[build] Run post-build verification');
await import(pathToFileURL(join(__dirname, 'postbuild-verify.mjs')));

console.log('[build] Completed successfully');
