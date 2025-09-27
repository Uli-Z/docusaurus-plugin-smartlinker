import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const siteDir = join(repoRoot, 'examples', 'site');
const pluginDistDir = join(repoRoot, 'packages', 'docusaurus-plugin-smartlinker', 'dist');
const remarkDistDir = join(repoRoot, 'packages', 'remark-smartlinker', 'dist');

const disallowedTokens = ['node_modules', 'build', '.docusaurus'];

function filterSiteCopy(src) {
  const relativePath = relative(siteDir, src);
  if (!relativePath || relativePath.startsWith('..')) {
    return true;
  }
  const segments = relativePath.split(/[\\/]/);
  return !segments.some((segment) => disallowedTokens.includes(segment));
}

let tempRoot;
let tarballPath;
let packedSiteDir;
let tarballEntries;

function run(command: string, args: string[], options?: ExecFileSyncOptionsWithStringEncoding): string {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options,
    });
  } catch (error: any) {
    if (error?.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error?.stderr) {
      process.stderr.write(error.stderr);
    }
    throw error;
  }
}

beforeAll(() => {
  tempRoot = mkdtempSync(join(tmpdir(), 'smartlinker-example-'));
  const packOutput = run('pnpm', ['pack', '--pack-destination', tempRoot], {
    cwd: repoRoot,
  });
  const packLines = packOutput.trim().split(/\r?\n/).filter(Boolean);
  const tarballName = packLines[packLines.length - 1];
  tarballPath = resolve(tempRoot, tarballName);

  packedSiteDir = join(tempRoot, 'site');
  cpSync(siteDir, packedSiteDir, { recursive: true, filter: filterSiteCopy });

  const pkgJsonPath = join(packedSiteDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const relativeTarball = relative(packedSiteDir, tarballPath);
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies['docusaurus-plugin-smartlinker'] = `file:${relativeTarball}`;
  writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);

  run('pnpm', ['install', '--frozen-lockfile=false', '--reporter=silent'], {
    cwd: packedSiteDir,
  });
  console.info('Installed example site dependencies via pnpm');

  run('pnpm', ['exec', 'docusaurus', 'build'], {
    cwd: packedSiteDir,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', TERM: 'dumb' },
  });
  console.info('Built example site with packed plugin');

  const tarListing = run('tar', ['-tf', tarballPath]);
  tarballEntries = tarListing.trim().split(/\r?\n/);
}, 360_000);

afterAll(() => {
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe('example site build', () => {
  it('builds plugin dist before packaging', () => {
    const files = [
      'index.js',
      'index.d.ts',
      'theme/index.js',
      'theme/styles.css',
      'theme/runtime/Root.js',
      'theme/runtime/SmartLink.js',
      'theme/runtime/Tooltip.js',
      'theme/runtime/IconResolver.js',
      'theme/runtime/context.js',
    ];
    for (const file of files) {
      const absolute = join(pluginDistDir, file);
      const contents = readFileSync(absolute, 'utf8');
      expect(contents.length).toBeGreaterThan(0);
    }
  });

  it('builds remark dist before packaging', () => {
    const files = ['index.js', 'index.d.ts', 'index.cjs'];
    for (const file of files) {
      const absolute = join(remarkDistDir, file);
      const contents = readFileSync(absolute, 'utf8');
      expect(contents.length).toBeGreaterThan(0);
    }
  });

  it('includes dist files in the packed tarball', () => {
    expect(tarballEntries).toEqual(expect.arrayContaining([
      'package/packages/docusaurus-plugin-smartlinker/dist/index.js',
      'package/packages/docusaurus-plugin-smartlinker/dist/index.d.ts',
      'package/packages/docusaurus-plugin-smartlinker/dist/theme/styles.css',
      'package/packages/remark-smartlinker/dist/index.js',
      'package/packages/remark-smartlinker/dist/index.d.ts',
      'package/packages/remark-smartlinker/dist/index.cjs',
    ]));
  });

  it('emits SmartLinks with Docusaurus-resolved hrefs', () => {
    const html = readFileSync(join(packedSiteDir, 'build', 'docs', 'demo', 'index.html'), 'utf8');
    expect(html).toContain('href="/docs/antibiotics/amoxicillin"');
    expect(html).toContain('href="/docs/antibiotics/piperacillin-tazobactam"');
  });
});
