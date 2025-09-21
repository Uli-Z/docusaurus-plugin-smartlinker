import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { createFsIndexProvider } from '../src/fsIndexProvider.js';

function normalizePath(value: string): string {
  const replaced = value.replace(/\\/g, '/').replace(/\/+$/, '');
  return replaced || '.';
}

describe('createFsIndexProvider', () => {
  it('preserves slugs and annotates folder ids', () => {
    const root = join(__dirname, 'fixtures', 'docs');
    const provider = createFsIndexProvider({ roots: [root] });

    const targets = provider.getAllTargets();
    expect(targets.length).toBeGreaterThan(0);

    const amox = targets.find(t => t.id === 'amoxicillin');
    expect(amox?.slug).toBe('/antibiotics/amoxicillin');
    expect(amox?.folderId).toBe(normalizePath(root));

    const filePath = provider.getCurrentFilePath({ path: '/tmp/example.mdx' } as any);
    expect(filePath).toBe('/tmp/example.mdx');
  });
});
