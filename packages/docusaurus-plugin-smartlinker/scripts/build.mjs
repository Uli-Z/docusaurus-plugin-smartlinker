import { rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = dirname(__dirname);
const remarkDir = join(packageDir, '..', 'remark-smartlinker');
const distDir = join(packageDir, 'dist');
const remarkDistDir = join(remarkDir, 'dist');
const remarkTargetDir = join(distDir, 'remark');
const remarkCjsDir = join(remarkDir, 'dist-cjs');

const require = createRequire(import.meta.url);
const tscBin = require.resolve('typescript/bin/tsc');

const runTsc = (cwd, project = 'tsconfig.json') => {
  execFileSync(process.execPath, [tscBin, '-p', project], {
    cwd,
    stdio: 'inherit'
  });
};

console.log('[build] Clean dist directory');
rmSync(distDir, { recursive: true, force: true });

console.log('[build] Compile plugin sources');
runTsc(packageDir);

console.log('[build] Compile remark helper sources');
runTsc(remarkDir);

console.log('[build] Compile remark helper (CommonJS)');
runTsc(remarkDir, 'tsconfig.cjs.json');

console.log('[build] Generate remark CommonJS bundle');
execFileSync(process.execPath, [join(remarkDir, 'scripts', 'build-cjs.js')], {
  cwd: remarkDir,
  stdio: 'inherit'
});

console.log('[build] Copy remark dist into plugin package');
if (!existsSync(remarkDistDir)) {
  const relPath = relative(packageDir, remarkDistDir);
  throw new Error(`Expected remark dist at ${relPath}, but it was not found.`);
}

mkdirSync(distDir, { recursive: true });
rmSync(remarkTargetDir, { recursive: true, force: true });
cpSync(remarkDistDir, remarkTargetDir, { recursive: true });

console.log('[build] Run post-build verification');
await import(pathToFileURL(join(__dirname, 'postbuild-verify.mjs')));

console.log('[build] Completed successfully');
