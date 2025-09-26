#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpmJson(args, options = {}) {
  const output = execFileSync(npmBin, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
    env: {
      npm_config_loglevel: 'error',
      npm_config_progress: 'false',
      npm_config_fund: 'false',
      ...process.env,
      ...(options?.env ?? {}),
    },
  });
  const start = output.indexOf('[');
  const end = output.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Failed to parse npm --json output: npm ${args.join(' ')}`);
  }
  return JSON.parse(output.slice(start, end + 1));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = dirname(__dirname);

let tarballPath;
let tempDir;

try {
  console.log('▶ Packing plugin for verification...');
  const entries = runNpmJson(['pack', '--json'], { cwd: packageDir });
  if (!entries.length || !entries[0]?.filename) {
    throw new Error('npm pack did not output a filename');
  }
  tarballPath = join(packageDir, entries[0].filename);

  tempDir = mkdtempSync(join(tmpdir(), 'smartlinker-pack-'));
  console.log('▶ Extracting tarball for inspection...');
  execFileSync('tar', ['-xf', tarballPath, '-C', tempDir]);

  const packageExtractDir = join(tempDir, 'package');
  const pkgJsonPath = join(packageExtractDir, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    throw new Error('Extracted tarball is missing package.json');
  }

  const pkgJsonRaw = readFileSync(pkgJsonPath, 'utf8');
  if (pkgJsonRaw.includes('workspace:')) {
    throw new Error('Tarball still references workspace: protocol');
  }
  if (pkgJsonRaw.includes('link:')) {
    throw new Error('Tarball still references link: protocol');
  }

  const pkgJson = JSON.parse(pkgJsonRaw);
  const exportsField = pkgJson.exports ?? {};

  const rootExport = exportsField['.'];
  if (!rootExport || !rootExport.import || !rootExport.types) {
    throw new Error('Root export must expose import and types entries');
  }

  const remarkExport = exportsField['./remark'];
  if (!remarkExport || !remarkExport.import || !remarkExport.require || !remarkExport.types) {
    throw new Error('Remark export must expose import, require, and types entries');
  }

  const remarkDir = join(packageExtractDir, 'dist', 'remark');
  const remarkArtifacts = [
    join(remarkDir, 'index.js'),
    join(remarkDir, 'index.cjs'),
    join(remarkDir, 'index.d.ts'),
  ];
  for (const file of remarkArtifacts) {
    if (!existsSync(file)) {
      throw new Error(`Tarball is missing expected remark artifact: ${file}`);
    }
  }

  console.log('✔ Tarball verification succeeded.');
} finally {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
}
