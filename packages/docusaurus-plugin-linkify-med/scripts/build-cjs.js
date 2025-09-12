import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, renameSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkgRoot = join(__dirname, '..');
execSync('tsc -p tsconfig.json --module commonjs --moduleResolution node --outDir dist-cjs', {
  cwd: pkgRoot,
  stdio: 'inherit',
});
renameSync(join(pkgRoot, 'dist-cjs/index.js'), join(pkgRoot, 'dist/index.cjs'));
rmSync(join(pkgRoot, 'dist-cjs'), { recursive: true, force: true });
