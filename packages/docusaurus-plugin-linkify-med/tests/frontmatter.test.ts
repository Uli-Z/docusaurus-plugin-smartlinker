import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndexFromFiles } from '../src/frontmatterAdapter.js';
import type { RawDocFile } from '../src/types.js';

function fx(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'docs', name), 'utf8');
}

describe('frontmatter loader (raw)', () => {
  it('parses valid entries and skips invalid ones with warnings', () => {
    const files: RawDocFile[] = [
      { path: '/docs/ok-amoxicillin.mdx', content: fx('ok-amoxicillin.mdx') },
      { path: '/docs/ok-vancomycin.md', content: fx('ok-vancomycin.md') },
      { path: '/docs/skip-linkify-false.mdx', content: fx('skip-linkify-false.mdx') },
      { path: '/docs/bad-missing-id.mdx', content: fx('bad-missing-id.mdx') },
      { path: '/docs/bad-empty-synonyms.mdx', content: fx('bad-empty-synonyms.mdx') },
      { path: '/docs/bad-slug.mdx', content: fx('bad-slug.mdx') },
      { path: '/docs/bad-notarray-synonyms.mdx', content: fx('bad-notarray-synonyms.mdx') },
    ];

    const { entries, warnings } = loadIndexFromFiles(files);

    // Entries: amoxicillin + vancomycin
    expect(entries.map(e => e.id).sort()).toEqual(['amoxicillin', 'vancomycin']);
    const amox = entries.find(e => e.id === 'amoxicillin')!;
    expect(amox.slug).toBe('/antibiotics/amoxicillin');
    expect(amox.synonyms).toEqual(['Amoxi', 'Amox', 'Amoxicillinum']);
    expect(amox.linkify).toBe(true);
    expect(amox.icon).toBe('pill');
    expect(amox.shortNote).toMatch(/Aminopenicillin/);

    const vanco = entries.find(e => e.id === 'vancomycin')!;
    expect(vanco.icon).toBeUndefined();
    expect(vanco.shortNote).toBeUndefined();
    expect(vanco.synonyms).toEqual(['Vanco', 'Vancomycinum']);

    // Warnings: linkify:false, missing id, empty synonyms, bad slug, non-array synonyms
    const codes = warnings.map(w => w.code).sort();
    expect(codes).toEqual([
      'EMPTY_ID',
      'EMPTY_SYNONYMS',
      'INVALID_TYPE', // slug must start with '/'
      'INVALID_TYPE', // non-array synonyms
      'LINKIFY_FALSE'
    ].sort());
  });

  it('skips unsupported extensions', () => {
    const files: RawDocFile[] = [
      { path: '/docs/file.txt', content: '---\nid: x\nslug: /x\nsynonyms: [x]\n---\n' }
    ];
    const { entries, warnings } = loadIndexFromFiles(files);
    expect(entries.length).toBe(0);
    expect(warnings[0].code).toBe('UNSUPPORTED_EXT');
  });

  it('trims and drops empty shortNote', () => {
    const files: RawDocFile[] = [
      { path: '/docs/a.mdx', content: '---\nid: a\nslug: /a\nsynonyms: [A]\nshortNote: "    "\n---\n' }
    ];
    const { entries } = loadIndexFromFiles(files);
    expect(entries.length).toBe(1);
    expect(entries[0].shortNote).toBeUndefined();
  });
});
