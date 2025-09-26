import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = join(__dirname, '..');
const distDir = join(packageDir, 'dist');
const themeDistDir = join(distDir, 'theme');
const runtimeDistDir = join(themeDistDir, 'runtime');
const themeSrcDir = join(packageDir, 'src', 'theme');
const require = createRequire(import.meta.url);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(existsSync(distDir), 'dist directory is missing. Run tsc before postbuild.');

const requiredFiles = [
  join(distDir, 'index.js'),
  join(distDir, 'index.cjs'),
  join(distDir, 'index.d.ts'),
  join(distDir, 'remark', 'index.js'),
  join(distDir, 'remark', 'index.cjs'),
  join(distDir, 'remark', 'index.d.ts'),
  join(themeDistDir, 'index.js'),
  join(themeDistDir, 'index.cjs'),
  join(runtimeDistDir, 'Root.js'),
  join(runtimeDistDir, 'Root.cjs'),
  join(runtimeDistDir, 'SmartLink.js'),
  join(runtimeDistDir, 'SmartLink.cjs'),
  join(runtimeDistDir, 'Tooltip.js'),
  join(runtimeDistDir, 'Tooltip.cjs'),
  join(runtimeDistDir, 'IconResolver.js'),
  join(runtimeDistDir, 'IconResolver.cjs'),
  join(runtimeDistDir, 'context.js'),
  join(runtimeDistDir, 'context.cjs'),
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
const requirePattern = /require\(\s*['"](\.{1,2}\/[^'\"]+)['"]\s*\)/g;
const allowedExtensions = new Set(['.js', '.cjs', '.json', '.css']);

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
    while ((match = requirePattern.exec(content))) {
      validateSpecifier(match[1], file);
    }
  }
}

console.log('postbuild-verify: copied styles.css and verified relative specifiers.');

const pluginRequire = require(join(distDir, 'index.cjs'));
const pluginFactory =
  typeof pluginRequire === 'function' ? pluginRequire : pluginRequire?.default;
if (typeof pluginFactory !== 'function') {
  throw new Error('CJS entry did not export a function.');
}

const remarkRequire = require(join(distDir, 'remark', 'index.cjs'));
const remarkFactory =
  typeof remarkRequire === 'function' ? remarkRequire : remarkRequire?.default;
if (typeof remarkFactory !== 'function') {
  throw new Error('CJS remark entry did not export a function.');
}

console.log('postbuild-verify: CommonJS entry points load successfully.');
