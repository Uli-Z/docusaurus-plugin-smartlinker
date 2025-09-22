import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndexFromFiles } from '../src/frontmatterAdapter.js';
import type { RawDocFile } from '../src/types.js';

function fx(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'docs', name), 'utf8');
}

function doc(name: string, relativePath: string): RawDocFile {
  return { path: `/docs/${name}`, relativePath, content: fx(name) };
}

describe('frontmatter loader (raw)', () => {
  it('parses valid entries and skips invalid ones with warnings', () => {
    const files: RawDocFile[] = [
      doc('ok-amoxicillin.mdx', 'antibiotics/amoxicillin.mdx'),
      doc('ok-vancomycin.md', 'antibiotics/vancomycin.md'),
      doc('skip-linkify-false.mdx', 'antibiotics/ceftriaxone.mdx'),
      doc('bad-missing-id.mdx', 'antibiotics/linezolid.mdx'),
      doc('bad-empty-smartlink-terms.mdx', 'antibiotics/gentamicin.mdx'),
      doc('bad-slug.mdx', 'antibiotics/clindamycin.mdx'),
      doc('bad-notarray-smartlink-terms.mdx', 'antibiotics/pip-tazo.mdx'),
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

    // Warnings: linkify:false, missing id, empty smartlink-terms list, bad slug, non-array smartlink-terms
    const codes = warnings.map(w => w.code).sort();
    expect(codes).toEqual([
      'EMPTY_ID',
      'EMPTY_SMARTLINK_TERMS',
      'INVALID_TYPE', // slug must start with '/'
      'INVALID_TYPE', // non-array smartlink-terms
      'LINKIFY_FALSE'
    ].sort());
  });

  it('skips unsupported extensions', () => {
    const files: RawDocFile[] = [
      { path: '/docs/file.txt', relativePath: 'file.txt', content: '---\nid: x\nslug: /x\nsmartlink-terms: [x]\n---\n' }
    ];
    const { entries, warnings } = loadIndexFromFiles(files);
    expect(entries.length).toBe(0);
    expect(warnings[0].code).toBe('UNSUPPORTED_EXT');
  });

  it('trims and drops empty shortNote', () => {
    const files: RawDocFile[] = [
      { path: '/docs/a.mdx', relativePath: 'a.mdx', content: '---\nid: a\nslug: /a\nsmartlink-terms: [A]\nsmartlink-short-note: "    "\n---\n' }
    ];
    const { entries } = loadIndexFromFiles(files);
    expect(entries.length).toBe(1);
    expect(entries[0].shortNote).toBeUndefined();
  });

  it('skips files without smartlink frontmatter', () => {
    const files: RawDocFile[] = [
      {
        path: '/docs/no-auto.mdx',
        relativePath: 'no-auto.mdx',
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

  it('normalizes smartlink terms by trimming and deduplicating', () => {
    const files: RawDocFile[] = [
      {
        path: '/docs/norm.mdx',
        relativePath: 'norm.mdx',
        content: [
          '---',
          'id: norm',
          'slug: /docs/norm',
          'smartlink-terms:',
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

  it('infers slug from the relative path when it is omitted', () => {
    const files: RawDocFile[] = [
      {
        path: '/docs/antibiotics/amoxicillin.mdx',
        relativePath: 'antibiotics/amoxicillin.mdx',
        content: [
          '---',
          'id: amox-default',
          'smartlink-terms:',
          '  - Amox',
          '---',
          '',
          'Body',
        ].join('\n')
      }
    ];

    const { entries, warnings } = loadIndexFromFiles(files);
    expect(warnings).toHaveLength(0);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.slug).toBe('/antibiotics/amoxicillin');
  });
});
