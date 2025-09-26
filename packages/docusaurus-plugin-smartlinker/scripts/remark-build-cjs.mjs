import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageDir = dirname(__dirname);
const remarkDistDir = join(packageDir, 'dist', 'remark');
const remarkCjsDir = join(packageDir, 'dist', 'remark-cjs');

if (!existsSync(remarkCjsDir)) {
  throw new Error('CommonJS remark build output (dist/remark-cjs) is missing. Run tsc with tsconfig.remark.cjs.json first.');
}

const entries = ['index', 'matcher', 'transform'];

for (const entry of entries) {
  const sourcePath = join(remarkCjsDir, `${entry}.js`);
  const targetPath = join(remarkDistDir, `${entry}.cjs`);

  let code = readFileSync(sourcePath, 'utf8');
  code = code.replace(/(require\(\s*['"]\.\/[\w\-\/]+)\.js(['"]\s*\))/g, '$1.cjs$2');
  writeFileSync(targetPath, code);
}

rmSync(remarkCjsDir, { recursive: true, force: true });
