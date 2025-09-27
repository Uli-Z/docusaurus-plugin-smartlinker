import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '..', '..');
export const exampleSiteRoot = join(repoRoot, 'examples', 'site');

export const REQUIRED_DIST_PATHS = [
  'packages/docusaurus-plugin-smartlinker/dist/index.js',
  'packages/docusaurus-plugin-smartlinker/dist/index.d.ts',
  'packages/docusaurus-plugin-smartlinker/dist/theme/index.js',
  'packages/docusaurus-plugin-smartlinker/dist/theme/styles.css',
  'packages/docusaurus-plugin-smartlinker/dist/theme/runtime/context.js',
  'packages/docusaurus-plugin-smartlinker/dist/types.d.ts',
  'packages/remark-smartlinker/dist/index.js',
  'packages/remark-smartlinker/dist/index.cjs',
  'packages/remark-smartlinker/dist/index.d.ts',
];

export const REQUIRED_TARBALL_ENTRIES = REQUIRED_DIST_PATHS.map(
  (path) => `package/${path}`
);

export const EXAMPLE_HTML_ASSERTIONS = [
  'href="/docs/antibiotics/amoxicillin"',
  'href="/docs/antibiotics/piperacillin-tazobactam"',
];

function run(command, args, options = {}) {
  const { stdio = 'inherit', env: optionEnv, ...rest } = options;
  const env = { ...process.env, ...optionEnv };
  try {
    return execFileSync(command, args, { stdio, ...rest, env });
  } catch (error) {
    const stdout = error?.stdout ? error.stdout.toString() : '';
    const stderr = error?.stderr ? error.stderr.toString() : '';
    const detail = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
    const commandLine = `${command} ${args.join(' ')}`.trim();
    const message = detail
      ? `Command failed: ${commandLine}\n${detail}`
      : `Command failed: ${commandLine}`;
    const wrapped = new Error(message);
    wrapped.cause = error;
    throw wrapped;
  }
}

function runPnpm(args, options = {}) {
  return run('pnpm', args, {
    ...options,
    env: { CI: '1', npm_config_loglevel: 'error', ...options.env },
  });
}

export function verifyDistLayout({ rootDir = repoRoot, required = REQUIRED_DIST_PATHS } = {}) {
  const details = required.map((relativePath) => {
    const absolutePath = join(rootDir, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Missing dist artifact: ${relativePath}`);
    }
    const stats = statSync(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`Expected file but found directory for ${relativePath}`);
    }
    if (stats.size === 0) {
      throw new Error(`File is empty: ${relativePath}`);
    }
    return { path: relativePath, size: stats.size };
  });
  return details;
}

export function createTarball({ rootDir = repoRoot } = {}) {
  const packDir = mkdtempSync(join(tmpdir(), 'smartlinker-pack-'));
  runPnpm(['pack', '--pack-destination', packDir], {
    cwd: rootDir,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const candidates = readdirSync(packDir).filter((entry) => entry.endsWith('.tgz'));
  if (candidates.length === 0) {
    throw new Error(`pnpm pack did not produce a tarball in ${packDir}`);
  }
  const tarballPath = join(packDir, candidates[0]);
  return {
    tarballPath,
    packDir,
    cleanup() {
      rmSync(packDir, { recursive: true, force: true });
    },
  };
}

export function listTarballEntries(tarballPath) {
  const output = run('tar', ['-tzf', tarballPath], { stdio: 'pipe', encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function copyExampleSite(targetDir) {
  cpSync(exampleSiteRoot, targetDir, {
    recursive: true,
    filter: (src) => {
      if (src === exampleSiteRoot) {
        return true;
      }
      const disallowed = [
        `${sep}node_modules${sep}`,
        `${sep}build${sep}`,
        `${sep}.docusaurus${sep}`,
      ];
      if (disallowed.some((token) => src.includes(token))) {
        return false;
      }
      return (
        !src.endsWith(`${sep}node_modules`) &&
        !src.endsWith(`${sep}build`) &&
        !src.endsWith(`${sep}.docusaurus`)
      );
    },
  });
}

export function buildExampleFromTarball({
  rootDir = repoRoot,
  tarballPath,
  assertions = EXAMPLE_HTML_ASSERTIONS,
} = {}) {
  if (!tarballPath) {
    throw new Error('tarballPath is required');
  }
  const tempDir = mkdtempSync(join(tmpdir(), 'smartlinker-example-'));
  const siteDir = join(tempDir, 'site');
  copyExampleSite(siteDir);

  const pkgPath = join(siteDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['docusaurus-plugin-smartlinker'] = `file:${tarballPath}`;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  runPnpm(['install', '--frozen-lockfile=false'], { cwd: siteDir });
  runPnpm(['run', 'build'], { cwd: siteDir });

  const htmlPath = join(siteDir, 'build', 'docs', 'demo', 'index.html');
  const html = readFileSync(htmlPath, 'utf8');
  for (const snippet of assertions) {
    if (!html.includes(snippet)) {
      throw new Error(`Example build output missing expected snippet: ${snippet}`);
    }
  }

  return {
    siteDir,
    tempDir,
    htmlPath,
    html,
    cleanup() {
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export function createVerificationContext() {
  const dist = verifyDistLayout({});
  const { tarballPath, cleanup: packCleanup } = createTarball({});
  const entries = listTarballEntries(tarballPath);
  for (const required of REQUIRED_TARBALL_ENTRIES) {
    if (!entries.includes(required)) {
      throw new Error(`Tarball missing required entry: ${required}`);
    }
  }
  const example = buildExampleFromTarball({ tarballPath });
  return {
    dist,
    tarballPath,
    tarEntries: entries,
    exampleHtml: example.html,
    exampleHtmlPath: example.htmlPath,
    cleanup() {
      example.cleanup();
      packCleanup();
    },
  };
}
