import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';
import plugin, { type TargetInfo, type IndexProvider } from '../src/transform.js';

function makeIndex(targets: TargetInfo[]): IndexProvider {
  return {
    getAllTargets() { return targets; },
    getCurrentFilePath(_file) { return '/docs/current.mdx'; }
  };
}

function run(input: string, targets: TargetInfo[]) {
  const proc = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(plugin, { index: makeIndex(targets) })
    .use(remarkStringify, { fences: true, bullet: '-', rule: '-' });
  return String(proc.processSync(input));
}

describe('remark-linkify-med transform', () => {
  const targets: TargetInfo[] = [
    { id: 'amoxicillin', slug: '/antibiotics/amoxicillin', icon: 'pill', sourcePath: '/a/amox.mdx', synonyms: ['Amoxi', 'Amoxicillin'] },
    { id: 'vancomycin', slug: '/antibiotics/vancomycin', sourcePath: '/a/vanco.mdx', synonyms: ['Vanco'] },
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
      { id: 'beta-lactam', slug: '/abx/beta', sourcePath: '/b.mdx', synonyms: ['ß-Laktam'] }
    ];
    const out = run('kein ß-Laktamase, aber ß-Laktam.', t2);
    expect(out).toContain('<SmartLink to="/abx/beta" tipKey="beta-lactam" match="ß-Laktam">ß-Laktam</SmartLink>');
    expect(out).toMatch(/kein ß-Laktamase, aber <SmartLink/);
  });

  it('deterministically picks smallest id when synonym is shared (Milestone 8 tie rule)', () => {
    const t3: TargetInfo[] = [
      { id: 'a-amox', slug: '/a', sourcePath: '/a.mdx', synonyms: ['Amoxi'] },
      { id: 'z-amox', slug: '/z', sourcePath: '/z.mdx', synonyms: ['Amoxi'] },
    ];
    const out = run('Amoxi here.', t3);
    expect(out).toContain('to="/a"');
    expect(out).toContain('tipKey="a-amox"');
  });

  it('skips linking synonyms on their own page', () => {
    const tSelf: TargetInfo[] = [
      { id: 'self', slug: '/docs/self', sourcePath: '/docs/current.mdx', synonyms: ['Self'] },
      { id: 'other', slug: '/docs/other', sourcePath: '/docs/other.mdx', synonyms: ['Other'] },
    ];
    const out = run('Self meets Other.', tSelf);
    expect(out).toContain('Self meets <SmartLink to="/docs/other" tipKey="other" match="Other">Other</SmartLink>.');
    expect(out).not.toContain('to="/docs/self"');
  });

  it('replaces short note placeholder with LinkifyShortNote', () => {
    const tSelf: TargetInfo[] = [
      { id: 'self', slug: '/docs/self', sourcePath: '/docs/current.mdx', synonyms: ['Self'] },
    ];
    const out = run('Intro %%SHORT_NOTICE%% outro.', tSelf);
    expect(out).toContain('Intro <LinkifyShortNote tipKey="self" /> outro.');
  });
});
