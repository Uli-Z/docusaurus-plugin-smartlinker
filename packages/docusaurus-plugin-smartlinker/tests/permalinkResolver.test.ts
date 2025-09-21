import { describe, it, expect } from 'vitest';
import { resolveEntryPermalinks } from '../src/node/permalinkResolver.js';
import type { IndexRawEntry } from '../src/types.js';

describe('resolveEntryPermalinks', () => {
  it('matches entries to doc metadata by docId, source, and slug', () => {
    const entries: Array<IndexRawEntry & { docId?: string | null }> = [
      {
        id: 'amoxicillin',
        slug: '/antibiotics/amoxicillin',
        terms: ['Amoxi'],
        linkify: true,
        icon: 'pill',
        shortNote: undefined,
        sourcePath: '/site/docs/antibiotics/amoxicillin.mdx',
        folderId: 'docs',
        docId: 'antibiotics/amoxicillin',
      },
      {
        id: 'pip-tazo',
        slug: '/antibiotics/piperacillin-tazobactam',
        terms: ['Pip-tazo'],
        linkify: true,
        icon: 'pill',
        shortNote: undefined,
        sourcePath: '/site/docs/antibiotics/pip-tazo.mdx',
        folderId: 'docs',
      },
      {
        id: 'cdiff',
        slug: '/bacteria/cdiff',
        terms: ['Cdiff'],
        linkify: true,
        icon: 'bug',
        shortNote: undefined,
        sourcePath: '/external/other.mdx',
        folderId: 'docs',
      },
    ];

    const docsContent = {
      default: {
        loadedVersions: [
          {
            docs: [
              {
                id: 'antibiotics/amoxicillin',
                source: '@site/docs/antibiotics/amoxicillin.mdx',
                permalink: '/docs/antibiotics/amoxicillin',
                slug: '/antibiotics/amoxicillin',
                frontMatter: { id: 'amoxicillin' },
              },
              {
                id: 'antibiotics/pip-tazo',
                source: '@site/docs/antibiotics/pip-tazo.mdx',
                permalink: '/docs/antibiotics/piperacillin-tazobactam',
                slug: '/antibiotics/piperacillin-tazobactam',
                frontMatter: { id: 'pip-tazo' },
              },
              {
                id: 'bacteria/cdiff',
                source: '@site/docs/bacteria/cdiff.mdx',
                permalink: '/docs/bacteria/cdiff',
                slug: '/bacteria/cdiff',
                frontMatter: { id: 'cdiff' },
              },
            ],
          },
        ],
      },
    } as any;

    const resolved = resolveEntryPermalinks({
      siteDir: '/site',
      entries,
      docsContent,
    });

    expect(resolved).toEqual([
      expect.objectContaining({ docId: 'antibiotics/amoxicillin', permalink: '/docs/antibiotics/amoxicillin' }),
      expect.objectContaining({ docId: 'antibiotics/pip-tazo', permalink: '/docs/antibiotics/piperacillin-tazobactam' }),
      expect.objectContaining({ docId: 'bacteria/cdiff', permalink: '/docs/bacteria/cdiff' }),
    ]);
  });
});
