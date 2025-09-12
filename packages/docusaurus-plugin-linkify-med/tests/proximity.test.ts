import { describe, it, expect } from 'vitest';
import { distance, resolveCollision } from '../src/proximity';
import type { IndexRawEntry } from '../src/types';

function fakeEntry(id: string, slug: string, path: string): IndexRawEntry {
  return {
    id,
    slug,
    synonyms: [id],
    linkify: true,
    sourcePath: path
  };
}

describe('distance()', () => {
  it('returns 0 for same folder', () => {
    expect(distance('/a/b/file.mdx', '/a/b/other.mdx')).toBe(0);
  });

  it('counts steps up and down to common ancestor', () => {
    expect(distance('/a/b/c/file.mdx', '/a/b/d/target.mdx')).toBe(2);
    expect(distance('/a/b/file.mdx', '/a/b/c/d/target.mdx')).toBe(2);
  });

  it('handles root differences', () => {
    expect(distance('/a/file.mdx', '/b/file.mdx')).toBe(2);
  });
});

describe('resolveCollision()', () => {
  it('returns single candidate if only one', () => {
    const e = fakeEntry('id1', '/slug1', '/a/b/file.mdx');
    const { chosen, warnings } = resolveCollision('syn', '/a/b/c/doc.mdx', [e]);
    expect(chosen).toBe(e);
    expect(warnings.length).toBe(0);
  });

  it('chooses nearest candidate by folder distance', () => {
    const e1 = fakeEntry('id1', '/slug1', '/a/b/c/file.mdx');
    const e2 = fakeEntry('id2', '/slug2', '/a/x/y/file.mdx');
    const { chosen } = resolveCollision('syn', '/a/b/c/doc.mdx', [e1, e2]);
    expect(chosen).toBe(e1);
  });

  it('breaks tie lexicographically and warns', () => {
    const e1 = fakeEntry('id1', '/aaa', '/a/b/x/file.mdx');
    const e2 = fakeEntry('id2', '/zzz', '/a/b/y/file.mdx');
    const { chosen, warnings } = resolveCollision('syn', '/a/b/c/doc.mdx', [e1, e2]);
    expect(chosen).toBe(e1);
    expect(warnings[0].code).toBe('COLLISION_TIE');
    expect(warnings[0].chosenId).toBe('id1');
  });

  it('returns null when no candidates', () => {
    const { chosen, warnings } = resolveCollision('syn', '/a/b/c/doc.mdx', []);
    expect(chosen).toBeNull();
    expect(warnings.length).toBe(0);
  });
});
