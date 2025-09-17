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
      { path: '/docs/bad-empty-auto-link.mdx', content: fx('bad-empty-auto-link.mdx') },
      { path: '/docs/bad-slug.mdx', content: fx('bad-slug.mdx') },
      { path: '/docs/bad-notarray-auto-link.mdx', content: fx('bad-notarray-auto-link.mdx') },
    ];

    const { entries, warnings } = loadIndexFromFiles(files);

    // Entries: amoxicillin + vancomycin
    expect(entries.map(e => e.id).sort()).toEqual(['amoxicillin', 'vancomycin']);
    const amox = entries.find(e => e.id === 'amoxicillin')!;
    expect(amox.slug).toBe('/antibiotics/amoxicillin');
    expect(amox.terms).toEqual(['Amoxi', 'Amox', 'Amoxicillinum']);
    expect(amox.linkify).toBe(true);
    expect(amox.icon).toBe('pill');
    expect(amox.shortNote).toMatch(/Aminopenicillin/);

    const vanco = entries.find(e => e.id === 'vancomycin')!;
    expect(vanco.icon).toBeUndefined();
    expect(vanco.shortNote).toBeUndefined();
    expect(vanco.terms).toEqual(['Vanco', 'Vancomycinum']);

    // Warnings: linkify:false, missing id, empty auto-link list, bad slug, non-array auto-link
    const codes = warnings.map(w => w.code).sort();
    expect(codes).toEqual([
      'EMPTY_ID',
      'EMPTY_AUTO_LINK',
      'INVALID_TYPE', // slug must start with '/'
      'INVALID_TYPE', // non-array auto-link
      'LINKIFY_FALSE'
    ].sort());
  });

  it('skips unsupported extensions', () => {
    const files: RawDocFile[] = [
      { path: '/docs/file.txt', content: '---\nid: x\nslug: /x\nauto-link: [x]\n---\n' }
    ];
    const { entries, warnings } = loadIndexFromFiles(files);
    expect(entries.length).toBe(0);
    expect(warnings[0].code).toBe('UNSUPPORTED_EXT');
  });

  it('trims and drops empty shortNote', () => {
    const files: RawDocFile[] = [
      { path: '/docs/a.mdx', content: '---\nid: a\nslug: /a\nauto-link: [A]\nauto-link-short-note: "    "\n---\n' }
    ];
    const { entries } = loadIndexFromFiles(files);
    expect(entries.length).toBe(1);
    expect(entries[0].shortNote).toBeUndefined();
  });

  it('skips files without auto-link frontmatter', () => {
    const files: RawDocFile[] = [
      {
        path: '/docs/no-auto.mdx',
        content: [
          '---',
          'id: no-auto',
          'slug: /docs/no-auto',
          'title: Present but ignored',
          '---',
          '',
          'Body'
        ].join('\n')
      }
    ];

    const { entries, warnings } = loadIndexFromFiles(files);
    expect(entries).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('normalizes auto-link terms by trimming and deduplicating', () => {
    const files: RawDocFile[] = [
      {
        path: '/docs/norm.mdx',
        content: [
          '---',
          'id: norm',
          'slug: /docs/norm',
          'auto-link:',
          '  - " Amoxi "',
          '  - amoxi',
          '  - ""',
          '  - AMOXI',
          '  - Vanco',
          '---'
        ].join('\n')
      }
    ];

    const { entries } = loadIndexFromFiles(files);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.terms).toEqual(['Amoxi', 'Vanco']);
  });
});
