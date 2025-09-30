import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = join(__dirname, '..');
const distDir = join(packageDir, 'dist');
const remarkDistDir = join(distDir, 'remark');
const themeDistDir = join(distDir, 'theme');
const runtimeDistDir = join(themeDistDir, 'runtime');
const themeSrcDir = join(packageDir, 'src', 'theme');
const tscOutDir = join(packageDir, 'dist-tsc');
const tscSrcDir = join(tscOutDir, 'docusaurus-plugin-smartlinker', 'src');
const tscRemarkSrcDir = join(tscOutDir, 'remark-smartlinker', 'src');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(existsSync(distDir), 'dist directory is missing. Run the TypeScript build before postbuild.');
assert(existsSync(tscOutDir), 'dist-tsc directory is missing. Ensure tsc completed before postbuild.');

function safeCopy(src, dest) {
  assert(existsSync(src), `Missing source artifact to copy: ${relative(packageDir, src)}`);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

safeCopy(join(tscSrcDir, 'index.d.ts'), join(distDir, 'index.d.ts'));
const indexDtsMap = join(tscSrcDir, 'index.d.ts.map');
if (existsSync(indexDtsMap)) {
  safeCopy(indexDtsMap, join(distDir, 'index.d.ts.map'));
}

const remarkDtsSrc = join(tscSrcDir, 'remark', 'index.d.ts');
if (existsSync(remarkDtsSrc)) {
  safeCopy(remarkDtsSrc, join(remarkDistDir, 'index.d.ts'));
  const remarkDtsMap = join(tscSrcDir, 'remark', 'index.d.ts.map');
  if (existsSync(remarkDtsMap)) {
    safeCopy(remarkDtsMap, join(remarkDistDir, 'index.d.ts.map'));
  }
} else {
  const fallbackRemarkDts = join(tscRemarkSrcDir, 'index.d.ts');
  if (existsSync(fallbackRemarkDts)) {
    safeCopy(fallbackRemarkDts, join(remarkDistDir, 'index.d.ts'));
  }
}

function copyDir(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(join(tscSrcDir, 'theme'), themeDistDir);

for (const baseName of ['options', 'pluginName']) {
  for (const ext of ['.js', '.d.ts', '.js.map', '.d.ts.map']) {
    const source = join(tscSrcDir, `${baseName}${ext}`);
    if (existsSync(source)) {
      safeCopy(source, join(distDir, `${baseName}${ext}`));
    }
  }
}

const requiredFiles = [
  join(distDir, 'index.mjs'),
  join(distDir, 'index.cjs'),
  join(distDir, 'index.d.ts'),
  join(remarkDistDir, 'index.mjs'),
  join(remarkDistDir, 'index.cjs'),
  join(remarkDistDir, 'index.d.ts'),
  join(themeDistDir, 'index.js'),
  join(runtimeDistDir, 'Root.js'),
  join(runtimeDistDir, 'SmartLink.js'),
  join(runtimeDistDir, 'Tooltip.js'),
  join(runtimeDistDir, 'IconResolver.js'),
  join(runtimeDistDir, 'LinkifyShortNote.js'),
  join(runtimeDistDir, 'context.js')
];

for (const file of requiredFiles) {
  assert(existsSync(file), `Missing expected build artifact: ${relative(packageDir, file)}`);
}

const cssSrc = join(themeSrcDir, 'styles.css');
assert(existsSync(cssSrc), 'Source theme/styles.css is missing.');
mkdirSync(themeDistDir, { recursive: true });
const cssDest = join(themeDistDir, 'styles.css');
copyFileSync(cssSrc, cssDest);

// Remove legacy single-format outputs when present so the published package
// only exposes the multi-format bundles.
const legacyIndexJs = join(distDir, 'index.js');
if (existsSync(legacyIndexJs)) {
  rmSync(legacyIndexJs);
}
const legacyRemarkJs = join(remarkDistDir, 'index.js');
if (existsSync(legacyRemarkJs)) {
  rmSync(legacyRemarkJs);
}
if (existsSync(tscOutDir)) {
  rmSync(tscOutDir, { recursive: true, force: true });
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const relImportPattern = /from\s+['"](\.{1,2}\/[^'\"]+)['"]/g;
const relExportPattern = /export[^;]+from\s+['"](\.{1,2}\/[^'\"]+)['"]/g;
const allowedExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.css']);

function validateSpecifier(specifier, filePath) {
  if (specifier.includes('${')) {
    return;
  }
  const match = /\.([a-z0-9]+)(\?|$)/i.exec(specifier);
  const ext = match ? `.${match[1]}` : null;
  assert(
    ext && allowedExtensions.has(ext),
    `File ${relative(packageDir, filePath)} has relative import without explicit extension: ${specifier}`
  );
}

for (const file of walk(distDir)) {
  if (!file.endsWith('.js') && !file.endsWith('.mjs') && !file.endsWith('.cjs')) continue;
  const content = readFileSync(file, 'utf8');
  let match;
  while ((match = relImportPattern.exec(content))) {
    validateSpecifier(match[1], file);
  }
  while ((match = relExportPattern.exec(content))) {
    validateSpecifier(match[1], file);
  }
}

console.log('postbuild-verify: verified multi-format outputs and copied styles.css.');
