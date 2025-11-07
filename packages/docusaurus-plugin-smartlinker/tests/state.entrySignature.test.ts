import { describe, it, expect } from 'vitest';
import { EntryStateCache } from '../src/plugin/state.js';
import type { IndexRawEntry } from '../src/types.js';

function makeEntry(partial?: Partial<IndexRawEntry>): IndexRawEntry {
  return {
    id: 'term-1',
    slug: '/docs/term-1',
    terms: ['Alpha', 'beta', 'Gamma'],
    linkify: true,
    icon: undefined,
    shortNote: 'A short note',
    sourcePath: 'docs/term-1.mdx',
    folderId: 'docs',
    docId: 'docs/term-1',
    ...(partial ?? {}),
  };
}

describe('EntryStateCache signature stability', () => {
  it('does not mark changed when only terms order changes', () => {
    const cache = new EntryStateCache('/');

    const initial: IndexRawEntry[] = [makeEntry({ terms: ['Alpha', 'beta', 'Gamma'] })];
    cache.refresh(initial);

    // Same terms but different order
    const next: IndexRawEntry[] = [makeEntry({ terms: ['Gamma', 'Alpha', 'beta'] })];

    const diff = cache.diff(next, new Set());
    expect(diff.changedTermIds.has('term-1')).toBe(false);
    expect(diff.addedTermIds.size).toBe(0);
    expect(diff.removedTermIds.size).toBe(0);
  });

  it('marks changed when terms content changes', () => {
    const cache = new EntryStateCache('/');

    const initial: IndexRawEntry[] = [makeEntry({ terms: ['Alpha', 'beta', 'Gamma'] })];
    cache.refresh(initial);

    // Modify terms content (remove one, add new)
    const next: IndexRawEntry[] = [
      makeEntry({ terms: ['Alpha', 'beta', 'Delta'] }),
    ];

    const diff = cache.diff(next, new Set());
    expect(diff.changedTermIds.has('term-1')).toBe(true);
    expect(diff.addedTermIds.size).toBe(0);
    expect(diff.removedTermIds.size).toBe(0);
  });
});

