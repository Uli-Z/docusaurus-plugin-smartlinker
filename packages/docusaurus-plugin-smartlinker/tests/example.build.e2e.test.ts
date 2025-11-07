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
const pluginRemarkDistDir = join(pluginDistDir, 'remark');
const repoName = 'docusaurus-plugin-smartlinker';

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

const ensureSlashes = (value: string) => {
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
};

const normalizedBaseUrl = (() => {
  if (process.env.SITE_BASE_URL) {
    return ensureSlashes(process.env.SITE_BASE_URL);
  }

  if (process.env.GITHUB_ACTIONS === 'true' && repoName) {
    return ensureSlashes(`/${repoName}`);
  }

  return '/';
})();

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
  console.info('Preparing temporary workspace for example site build test');
  tempRoot = mkdtempSync(join(tmpdir(), 'smartlinker-example-'));
  console.info('Packing plugin tarball with pnpm (workspace)');
  // Pack only the publishable plugin workspace so the tarball includes dist/ assets
  // even though they are not committed to git.
  const packOutput = run('pnpm', ['-C', 'packages/docusaurus-plugin-smartlinker', 'pack', '--silent', '--pack-destination', tempRoot], {
    cwd: repoRoot,
  });
  const packLines = packOutput.trim().split(/\r?\n/).filter(Boolean);
  const tarballName = packLines[packLines.length - 1];
  tarballPath = resolve(tempRoot, tarballName);

  packedSiteDir = join(tempRoot, 'site');
  console.info('Copying example site into temporary workspace');
  cpSync(siteDir, packedSiteDir, { recursive: true, filter: filterSiteCopy });

  const pkgJsonPath = join(packedSiteDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const relativeTarball = relative(packedSiteDir, tarballPath);
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies['docusaurus-plugin-smartlinker'] = `file:${relativeTarball}`;
  console.info('Updated example site package.json to reference packed tarball');
  writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);

  console.info('Installing example site dependencies via pnpm (frozen lockfile disabled for temp workspace)');
  run('pnpm', ['install', '--frozen-lockfile=false', '--reporter=silent'], {
    cwd: packedSiteDir,
  });

  console.info('Running docusaurus build for example site');
  run('pnpm', ['exec', 'docusaurus', 'build'], {
    cwd: packedSiteDir,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', TERM: 'dumb' },
  });

  console.info('Reading packed tarball contents for assertions');
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
      'index.cjs',
      'index.mjs',
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
    const files = ['index.cjs', 'index.mjs', 'index.d.ts'];
    for (const file of files) {
      const absolute = join(pluginRemarkDistDir, file);
      const contents = readFileSync(absolute, 'utf8');
      expect(contents.length).toBeGreaterThan(0);
    }
  });

  it('includes dist files in the packed tarball', () => {
    const requiredEntries = [
      'package/dist/index.cjs',
      'package/dist/index.mjs',
      'package/dist/index.d.ts',
      'package/dist/theme/styles.css',
      'package/dist/remark/index.cjs',
      'package/dist/remark/index.mjs',
      'package/dist/remark/index.d.ts',
      'package/README.md',
      'package/LICENSE',
      'package/package.json',
    ];

    expect(tarballEntries).toEqual(expect.arrayContaining(requiredEntries));
  });

  it('emits SmartLinks with Docusaurus-resolved hrefs', () => {
    const html = readFileSync(join(packedSiteDir, 'build', 'docs', 'demo', 'index.html'), 'utf8');
    const expectedLinks = [
      'docs/antibiotics/amoxicillin',
      'docs/antibiotics/piperacillin-tazobactam',
    ].map((path) => `${normalizedBaseUrl}${path}`);

    for (const link of expectedLinks) {
      expect(html).toContain(`href="${link}"`);
    }
  });
});
