import { rmSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = dirname(__dirname);
const distDir = join(packageDir, 'dist');
const tmpCjsDir = join(packageDir, 'dist-cjs');

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
rmSync(tmpCjsDir, { recursive: true, force: true });

console.log('[build] Compile TypeScript (ESM)');
runTsc('tsconfig.json');

console.log('[build] Compile TypeScript (CJS)');
runTsc('tsconfig.cjs.json');

const walk = (dir) => {
  const entries = [];
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walk(full));
    } else {
      entries.push(full);
    }
  }
  return entries;
};

const rewriteCjsImports = (code) =>
  code.replace(/(require\(\s*['"])(\.{1,2}\/[^'"?#]+?)(\.js)(['"]\s*\))/g, '$1$2.cjs$4');

console.log('[build] Generate .cjs copies alongside ESM output');
if (!existsSync(tmpCjsDir)) {
  throw new Error('CommonJS build output (dist-cjs) is missing.');
}

for (const file of walk(tmpCjsDir)) {
  if (!file.endsWith('.js')) continue;
  const rel = relative(tmpCjsDir, file);
  const target = join(distDir, rel).replace(/\.js$/u, '.cjs');
  const dir = dirname(target);
  mkdirSync(dir, { recursive: true });
  const content = readFileSync(file, 'utf8');
  const rewritten = rewriteCjsImports(content);
  writeFileSync(target, rewritten);
}

rmSync(tmpCjsDir, { recursive: true, force: true });

console.log('[build] Run post-build verification');
await import(pathToFileURL(join(__dirname, 'postbuild-verify.mjs')));

console.log('[build] Completed successfully');
