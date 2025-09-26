import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, '../dist');
const cjsDir = join(__dirname, '../dist-cjs');

if (!existsSync(cjsDir)) {
  throw new Error('CommonJS build output (dist-cjs) is missing. Run tsc with tsconfig.cjs.json first.');
}

const entries = ['index', 'matcher', 'transform'];

for (const entry of entries) {
  const sourcePath = join(cjsDir, `${entry}.js`);
  const targetPath = join(distDir, `${entry}.cjs`);

  let code = readFileSync(sourcePath, 'utf8');
  code = code.replace(/(require\(\s*['"]\.\/[\w\-\/]+)\.js(['"]\s*\))/g, '$1.cjs$2');
  writeFileSync(targetPath, code);
}

// Clean up intermediate CJS directory to keep package tidy
rmSync(cjsDir, { recursive: true, force: true });
