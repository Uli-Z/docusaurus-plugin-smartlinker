import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = dirname(__dirname);
const distDir = join(packageDir, 'dist');
const pkgJsonPath = join(packageDir, 'package.json');

const walkFiles = (dir) => {
  const entries = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walkFiles(full));
    } else {
      entries.push(full);
    }
  }
  return entries;
};

const textExtensions = new Set(['.js', '.cjs', '.mjs', '.ts', '.d.ts', '.json', '.md', '.css']);
const forbiddenPatterns = [/['"]workspace:/i, /['"]file:/i];

const filesToScan = [pkgJsonPath, ...walkFiles(distDir)];

for (const file of filesToScan) {
  const ext = file.slice(file.lastIndexOf('.'));
  if (!textExtensions.has(ext)) {
    continue;
  }
  const content = readFileSync(file, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error(`Forbidden pattern ${pattern} found in ${file}`);
    }
  }
}

console.log('verify-tarball: dist artifacts free of workspace:/file: specifiers.');
