import { describe, it, expect, afterAll } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';
import plugin, { type TargetInfo, type IndexProvider, type RemarkSmartlinkerOptions } from '../../src/remark/transform.js';
import { setIndexEntries, clearIndexProvider } from '../../src/indexProviderStore.js';
import type { IndexRawEntry } from '../../src/types.js';

function makeIndex(targets: TargetInfo[]): IndexProvider {
  return {
    getAllTargets() { return targets; },
    getCurrentFilePath(_file) { return '/docs/current.mdx'; }
  };
}

function run(input: string, targets: TargetInfo[], extraOpts?: Partial<RemarkSmartlinkerOptions>) {
  const proc = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(plugin, { index: makeIndex(targets), ...(extraOpts ?? {}) })
    .use(remarkStringify, { fences: true, bullet: '-', rule: '-' });
  return String(proc.processSync(input));
}

function runWithPluginIndex(input: string, entries: IndexRawEntry[], filePath = '/docs/current.mdx', restrict?: string | string[]) {
  setIndexEntries(entries);

  const proc = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(plugin, restrict ? { restrictToFolders: restrict } : undefined)
    .use(remarkStringify, { fences: true, bullet: '-', rule: '-' });

  return String(proc.processSync({ value: input, path: filePath }));
}

describe('remark-smartlinker transform', () => {
  const targets: TargetInfo[] = [
    { id: 'amoxicillin', slug: '/antibiotics/amoxicillin', icon: 'pill', sourcePath: '/a/amox.mdx', terms: ['Amoxi', 'Amoxicillin'], folderId: 'docs' },
    { id: 'vancomycin', slug: '/antibiotics/vancomycin', sourcePath: '/a/vanco.mdx', terms: ['Vanco'], folderId: 'guides' },
  ];

  it('replaces all occurrences in paragraphs with <SmartLink>', () => {
    const out = run('Amoxi and Amoxicillin; Vanco. Amoxi!', targets);
    expect(out).toContain('<SmartLink to="/antibiotics/amoxicillin"');
    expect(out).toContain('tipKey="amoxicillin"');
    expect(out).toContain('icon="pill"');
    expect(out.match(/<SmartLink[^>]*>Amoxi<\/SmartLink>/g)?.length).toBe(2);
    expect(out).toContain('<SmartLink to="/antibiotics/amoxicillin"');
    expect(out).toContain('<SmartLink to="/antibiotics/vancomycin"');
  });

  it('skips code, inlineCode, links, images, and headings H1–H3', () => {
    const md = `
# Amoxi in H1
Some text with Amoxi.
\`Amoxi\` in inline code.
\`\`\`ts
// Amoxi in code block
\`\`\`
[A link Amoxi](https://example.com)
![alt Amoxi](/x.png)

#### H4 Amoxi (should transform here)
`;
    const out = run(md, targets);
    // H1 must not contain SmartLink (ensure only single-# heading is checked)
    expect(out).not.toMatch(/(^|\n)# [^\n]*<SmartLink/);
    // paragraph should transform
    expect(out).toMatch(/Some text with <SmartLink[^>]*>Amoxi<\/SmartLink>\./);
    // inline code & code block untouched
    expect(out).toMatch(/`Amoxi`/);
    expect(out).toMatch(/```ts[\s\S]*Amoxi[\s\S]*```/);
    // link and image untouched
    expect(out).toMatch(/\[A link Amoxi]\(https:\/\/example\.com\)/);
    expect(out).toMatch(/!\[alt Amoxi]\(\/x\.png\)/);
    // H4 should transform
    expect(out).toMatch(/#### H4 <SmartLink[^>]*>Amoxi<\/SmartLink> \(should transform here\)/);
  });

  it('prefers longest match and preserves all occurrences', () => {
    const out = run('Amoxicillin vs Amoxi vs Amoxicillin', targets);
    const matches = out.match(/<SmartLink[^>]*>(Amoxi|Amoxicillin)<\/SmartLink>/g) || [];
    expect(matches.length).toBe(3);
    const first = matches[0];
    expect(first).toMatch(/>Amoxicillin</);
  });

  it('is Unicode-aware (umlauts, ß) with boundaries', () => {
    const t2: TargetInfo[] = [
      { id: 'beta-lactam', slug: '/abx/beta', sourcePath: '/b.mdx', terms: ['ß-Laktam'] }
    ];
    const out = run('kein ß-Laktamase, aber ß-Laktam.', t2);
    expect(out).toContain('<SmartLink to="/abx/beta" tipKey="beta-lactam" match="ß-Laktam">ß-Laktam</SmartLink>');
    expect(out).toMatch(/kein ß-Laktamase, aber <SmartLink/);
  });

  it('deterministically picks smallest id when a term is shared (Milestone 8 tie rule)', () => {
    const t3: TargetInfo[] = [
      { id: 'a-amox', slug: '/a', sourcePath: '/a.mdx', terms: ['Amoxi'], folderId: 'a' },
      { id: 'z-amox', slug: '/z', sourcePath: '/z.mdx', terms: ['Amoxi'], folderId: 'z' },
    ];
    const out = run('Amoxi here.', t3);
    expect(out).toContain('to="/a"');
    expect(out).toContain('tipKey="a-amox"');
  });

  it('skips linking terms on their own page', () => {
    const tSelf: TargetInfo[] = [
      { id: 'self', slug: '/docs/self', sourcePath: '/docs/current.mdx', terms: ['Self'] },
      { id: 'other', slug: '/docs/other', sourcePath: '/docs/other.mdx', terms: ['Other'] },
    ];
    const out = run('Self meets Other.', tSelf);
    expect(out).toContain('Self meets <SmartLink to="/docs/other" tipKey="other" match="Other">Other</SmartLink>.');
    expect(out).not.toContain('to="/docs/self"');
  });

  it('transforms terms inside MDX JSX containers while preserving formatting', () => {
    const md = [
      'Intro <strong>Amoxi</strong>.',
      '',
      '<details>',
      '<summary><strong>Regimen</strong></summary>',
      '<p><strong>Amoxicillin</strong> dosage.</p>',
      '</details>',
      ''
    ].join('\n');
    const out = run(md, targets);
    expect(out).toContain('Intro <strong><SmartLink to="/antibiotics/amoxicillin" tipKey="amoxicillin" match="Amoxi" icon="pill">Amoxi</SmartLink></strong>.');
    expect(out).toContain('<p><strong><SmartLink to="/antibiotics/amoxicillin" tipKey="amoxicillin" match="Amoxicillin" icon="pill">Amoxicillin</SmartLink></strong> dosage.</p>');
  });

  it('replaces short note placeholder with LinkifyShortNote', () => {
    const tSelf: TargetInfo[] = [
      { id: 'self', slug: '/docs/self', sourcePath: '/docs/current.mdx', terms: ['Self'], folderId: 'docs' },
    ];
    const out = run('Intro %%SHORT_NOTICE%% outro.', tSelf);
    expect(out).toContain('Intro <LinkifyShortNote tipKey="self" /> outro.');
  });
  it('filters targets when restrictToFolders is provided', () => {
    const mixed: TargetInfo[] = [
      { id: 'doc-entry', slug: '/docs/doc-entry', sourcePath: '/docs/doc-entry.mdx', terms: ['DocEntry'], folderId: 'docs' },
      { id: 'other-entry', slug: '/guides/other-entry', sourcePath: '/guides/other-entry.mdx', terms: ['OtherEntry'], folderId: 'guides' },
    ];

    const out = run('DocEntry and OtherEntry.', mixed, { restrictToFolders: ['docs'] });
    expect(out).toContain('<SmartLink to="/docs/doc-entry" tipKey="doc-entry" match="DocEntry">DocEntry</SmartLink>');
    expect(out).toContain('OtherEntry.');
    expect(out).not.toContain('other-entry');
  });
});

describe('remark-smartlinker transform (plugin-managed index)', () => {
  const pluginEntries: IndexRawEntry[] = [
    {
      id: 'amoxicillin',
      slug: '/docs/antibiotics/amoxicillin',
      terms: ['Amoxi', 'Amoxicillin'],
      linkify: true,
      icon: 'pill',
      shortNote: undefined,
      sourcePath: '/docs/antibiotics/amoxicillin.mdx',
      folderId: 'docs',
    },
    {
      id: 'vancomycin',
      slug: '/docs/antibiotics/vancomycin',
      terms: ['Vanco'],
      linkify: true,
      icon: undefined,
      shortNote: undefined,
      sourcePath: '/docs/antibiotics/vancomycin.mdx',
      folderId: 'docs',
    },
  ];

  it('links terms using the plugin-registered index provider', () => {
    const out = runWithPluginIndex('Amoxi vs Vanco', pluginEntries);
    expect(out).toContain('<SmartLink to="/docs/antibiotics/amoxicillin"');
    expect(out).toContain('<SmartLink to="/docs/antibiotics/vancomycin"');
  });

  it('skips linking terms on their own page via plugin-managed index', () => {
    const out = runWithPluginIndex('Amoxi and Vanco', pluginEntries, '/docs/antibiotics/amoxicillin.mdx');
    expect(out).not.toContain('to="/docs/antibiotics/amoxicillin"');
    expect(out).toContain('to="/docs/antibiotics/vancomycin"');
  });

  it('honors restrictToFolders when using the plugin-managed index', () => {
    const extendedEntries: IndexRawEntry[] = [
      ...pluginEntries,
      {
        id: 'guides-entry',
        slug: '/guides/guides-entry',
        terms: ['GuidesEntry'],
        linkify: true,
        icon: undefined,
        shortNote: undefined,
        sourcePath: '/guides/guides-entry.mdx',
        folderId: 'guides',
      },
    ];

    const out = runWithPluginIndex('GuidesEntry and Vanco', extendedEntries, '/docs/overview.mdx', 'docs');
    expect(out).toContain('<SmartLink to="/docs/antibiotics/vancomycin"');
    expect(out).not.toContain('to="/guides/guides-entry"');
  });

  it('throws when no index provider has been registered', () => {
    clearIndexProvider();

    const proc = unified()
      .use(remarkParse)
      .use(remarkMdx)
      .use(plugin)
      .use(remarkStringify, { fences: true, bullet: '-', rule: '-' });

    expect(() => proc.processSync({ value: 'Plain text', path: '/docs/some.mdx' })).toThrow(
      /No index provider configured/
    );
  });

  afterAll(() => {
    clearIndexProvider();
  });
});
