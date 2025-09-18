import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const tscPath = require.resolve('typescript/lib/tsc.js');
const tsconfigPath = join(rootDir, 'tsconfig.remark.cjs.json');

const result = spawnSync(process.execPath, [tscPath, '--project', tsconfigPath], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  throw new Error('Failed to compile remark CJS bundle');
}

const tmpDir = join(rootDir, 'dist', 'remark-cjs');
const outDir = join(rootDir, 'dist', 'remark');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const targets = [
  { source: join(tmpDir, 'index.js'), dest: join(outDir, 'index.cjs'), rewriteMatcher: true },
  { source: join(tmpDir, 'matcher.js'), dest: join(outDir, 'matcher.cjs'), rewriteMatcher: false },
];

for (const target of targets) {
  if (!existsSync(target.source)) {
    throw new Error(`Missing expected CJS artifact: ${target.source}`);
  }
  let content = readFileSync(target.source, 'utf8');
  if (target.rewriteMatcher) {
    content = content.replace(/\.\/matcher\.js/g, './matcher.cjs');
  }
  writeFileSync(target.dest, content);
}

rmSync(tmpDir, { recursive: true, force: true });
