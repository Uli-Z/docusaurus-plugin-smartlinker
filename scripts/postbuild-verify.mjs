import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = join(__dirname, '..');
const distDir = join(packageDir, 'dist');
const themeDistDir = join(distDir, 'theme');
const runtimeDistDir = join(themeDistDir, 'runtime');
const remarkDistDir = join(distDir, 'remark');
const themeSrcDir = join(packageDir, 'src', 'theme');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(existsSync(distDir), 'dist directory is missing. Run tsc before postbuild.');

const requiredFiles = [
  join(distDir, 'index.js'),
  join(distDir, 'index.d.ts'),
  join(themeDistDir, 'index.js'),
  join(runtimeDistDir, 'Root.js'),
  join(runtimeDistDir, 'SmartLink.js'),
  join(runtimeDistDir, 'Tooltip.js'),
  join(runtimeDistDir, 'IconResolver.js'),
  join(runtimeDistDir, 'context.js'),
  join(remarkDistDir, 'index.js'),
  join(remarkDistDir, 'index.d.ts'),
  join(remarkDistDir, 'index.cjs'),
  join(remarkDistDir, 'matcher.js'),
  join(remarkDistDir, 'matcher.d.ts'),
  join(remarkDistDir, 'matcher.cjs'),
];

for (const file of requiredFiles) {
  assert(existsSync(file), `Missing expected build artifact: ${relative(packageDir, file)}`);
}

const cssSrc = join(themeSrcDir, 'styles.css');
assert(existsSync(cssSrc), 'Source theme/styles.css is missing.');
mkdirSync(themeDistDir, { recursive: true });
const cssDest = join(themeDistDir, 'styles.css');
copyFileSync(cssSrc, cssDest);

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
const cjsRequirePattern = /require\(['"](\.{1,2}\/[^'\"]+)['"]\)/g;
const allowedExtensions = new Set(['.js', '.json', '.css', '.cjs']);

function validateSpecifier(specifier, filePath) {
  if (specifier.includes('${')) {
    return;
  }
  const ext = specifier.replace(/^.*\./, '.');
  assert(
    allowedExtensions.has(ext),
    `File ${relative(packageDir, filePath)} has relative import without explicit extension: ${specifier}`
  );
}

for (const file of walk(distDir)) {
  if (!file.endsWith('.js') && !file.endsWith('.cjs')) continue;
  const content = readFileSync(file, 'utf8');
  let match;
  while ((match = relImportPattern.exec(content))) {
    validateSpecifier(match[1], file);
  }
  while ((match = relExportPattern.exec(content))) {
    validateSpecifier(match[1], file);
  }
  if (file.endsWith('.cjs')) {
    while ((match = cjsRequirePattern.exec(content))) {
      validateSpecifier(match[1], file);
    }
  }
}

console.log('postbuild-verify: copied styles.css and verified relative specifiers.');
