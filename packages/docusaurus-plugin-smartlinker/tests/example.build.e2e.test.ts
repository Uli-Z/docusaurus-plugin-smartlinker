import { describe, it, beforeAll, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const siteDir = join(repoRoot, 'examples', 'site');

beforeAll(() => {
  execFileSync('npm', ['run', 'site:build'], {
    cwd: repoRoot,
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
  });
}, 180_000);

describe('example site build', () => {
  it('emits SmartLinks with Docusaurus-resolved hrefs', () => {
    const html = readFileSync(join(siteDir, 'build', 'docs', 'demo', 'index.html'), 'utf8');
    expect(html).toContain('href="/docs/antibiotics/amoxicillin"');
    expect(html).toContain('href="/docs/antibiotics/piperacillin-tazobactam"');
  });
});
