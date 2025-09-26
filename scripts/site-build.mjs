import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const pluginDir = join(repoRoot, 'packages', 'docusaurus-plugin-smartlinker');

const run = (command, args, options = {}) => {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, CI: process.env.CI ?? '1' },
    ...options,
  });
};

run('npm', ['run', 'build', '--workspace', 'docusaurus-plugin-smartlinker']);

let tarballPath;
try {
  const packOutput = execFileSync('npm', ['pack'], {
    cwd: pluginDir,
    encoding: 'utf8',
  });

  process.stdout.write(packOutput);

  const filenameLine = packOutput
    .trim()
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.trim().endsWith('.tgz'));

  if (!filenameLine) {
    throw new Error('Failed to parse npm pack output for tarball filename.');
  }

  tarballPath = join(pluginDir, filenameLine.trim());

  run('npm', [
    'install',
    '--workspace',
    '@examples/site',
    tarballPath,
    '--no-save',
  ]);

  run('npm', ['run', 'build', '--workspace', '@examples/site']);
} finally {
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
}
