import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = join(__dirname, '..');
const distDir = join(packageDir, 'dist');
const themeDistDir = join(distDir, 'theme');
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
  join(themeDistDir, 'Root.js'),
  join(themeDistDir, 'SmartLink.js'),
  join(themeDistDir, 'Tooltip.js'),
  join(themeDistDir, 'IconResolver.js'),
  join(themeDistDir, 'context.js'),
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
const allowedExtensions = new Set(['.js', '.json', '.css']);

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
  if (!file.endsWith('.js')) continue;
  const content = readFileSync(file, 'utf8');
  let match;
  while ((match = relImportPattern.exec(content))) {
    validateSpecifier(match[1], file);
  }
  while ((match = relExportPattern.exec(content))) {
    validateSpecifier(match[1], file);
  }
}

console.log('postbuild-verify: copied styles.css and verified relative specifiers.');
