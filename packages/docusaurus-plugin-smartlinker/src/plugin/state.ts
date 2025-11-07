import type { IndexRawEntry } from '../types.js';
import { normalizeFsPath } from './paths.js';

export type DiffResult = {
  impactedTermIds: Set<string>;
  addedTermIds: Set<string>;
  removedTermIds: Set<string>;
  changedTermIds: Set<string>;
};

/**
 * Encapsulates entry caches and diffing across builds.
 */
export class EntryStateCache {
  private cachedEntries: IndexRawEntry[] = [];
  private cachedEntrySignatures = new Map<string, string>();
  private cachedEntriesBySource = new Map<string, IndexRawEntry[]>();

  constructor(private readonly siteDir: string) {}

  private computeEntrySignature(entry: IndexRawEntry): string {
    const termsSorted = [...entry.terms]
      .filter((t) => t != null)
      .map((t) => t.trim())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    return JSON.stringify({
      slug: entry.slug,
      terms: termsSorted,
      icon: entry.icon ?? null,
      shortNote: entry.shortNote ?? null,
      folderId: entry.folderId ?? null,
      sourcePath: normalizeFsPath(this.siteDir, entry.sourcePath ?? ''),
    });
  }

  refresh(entries: IndexRawEntry[]): void {
    this.cachedEntries = entries.map((e) => ({ ...e }));
    const signatures = new Map<string, string>();
    const bySource = new Map<string, IndexRawEntry[]>();
    for (const entry of entries) {
      signatures.set(entry.id, this.computeEntrySignature(entry));
      const key = normalizeFsPath(this.siteDir, entry.sourcePath ?? '');
      const list = bySource.get(key);
      if (list) list.push(entry);
      else bySource.set(key, [entry]);
    }
    this.cachedEntrySignatures = signatures;
    this.cachedEntriesBySource = bySource;
  }

  diff(nextEntries: IndexRawEntry[], impactedPaths: Set<string>): DiffResult {
    const impactedTermIds = new Set<string>();
    const nextBySource = new Map<string, IndexRawEntry[]>();
    const nextSignatures = new Map<string, string>();

    for (const entry of nextEntries) {
      const sourceKey = normalizeFsPath(this.siteDir, entry.sourcePath ?? '');
      const arr = nextBySource.get(sourceKey);
      if (arr) arr.push(entry);
      else nextBySource.set(sourceKey, [entry]);
      nextSignatures.set(entry.id, this.computeEntrySignature(entry));
    }

    for (const path of impactedPaths) {
      const prevEntries = this.cachedEntriesBySource.get(path);
      if (prevEntries) {
        for (const entry of prevEntries) impactedTermIds.add(entry.id);
      }
      const nextEntriesForPath = nextBySource.get(path);
      if (nextEntriesForPath) {
        for (const entry of nextEntriesForPath) impactedTermIds.add(entry.id);
      }
    }

    const addedTermIds = new Set<string>();
    const removedTermIds = new Set<string>();
    const changedTermIds = new Set<string>();

    for (const [id, signature] of nextSignatures) {
      const previous = this.cachedEntrySignatures.get(id);
      if (previous === undefined) {
        addedTermIds.add(id);
        changedTermIds.add(id);
      } else if (previous !== signature) {
        changedTermIds.add(id);
      }
    }

    for (const [id] of this.cachedEntrySignatures) {
      if (!nextSignatures.has(id)) {
        removedTermIds.add(id);
        changedTermIds.add(id);
      }
    }

    return { impactedTermIds, addedTermIds, removedTermIds, changedTermIds };
  }
}
