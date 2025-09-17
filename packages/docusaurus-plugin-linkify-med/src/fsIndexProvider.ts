import { readFileSync } from 'node:fs';
import { scanMdFileStats } from './node/fsScan.js';
import { parseFrontmatterFile } from './frontmatter.js';
import type { IndexRawEntry } from './types.js';

export interface FsIndexProviderOptions {
  roots: string[]; // absolute directories to scan
  /**
   * Optional slug prefix to prepend to every `slug` discovered in frontmatter.
   * Useful when docs are served from a subroute like `/docs`.
   */
  slugPrefix?: string;
}

export interface TargetInfo {
  id: string;
  slug: string;
  icon?: string;
  sourcePath: string;
  terms: string[];
}

export interface IndexProvider {
  getAllTargets(): TargetInfo[];
  getCurrentFilePath(file: { path?: string }): string;
}

/**
 * Create a remark-linkify-med IndexProvider by scanning the file system
 * for MD/MDX files and parsing their frontmatter.
 */
type CacheEntry = {
  mtimeMs: number;
  entry?: IndexRawEntry;
};

function entriesEqual(a?: IndexRawEntry, b?: IndexRawEntry): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id) return false;
  if (a.slug !== b.slug) return false;
  if (a.icon !== b.icon) return false;
  if (a.sourcePath !== b.sourcePath) return false;
  if (a.terms.length !== b.terms.length) return false;
  for (let i = 0; i < a.terms.length; i += 1) {
    if (a.terms[i] !== b.terms[i]) return false;
  }
  return true;
}

export function createFsIndexProvider(opts: FsIndexProviderOptions): IndexProvider {
  const roots = opts.roots;
  const prefix = opts.slugPrefix ?? '';

  const cache = new Map<string, CacheEntry>();
  let targetsCache: TargetInfo[] | null = null;

  function rebuildTargets() {
    const next: TargetInfo[] = [];
    for (const value of cache.values()) {
      const entry = value.entry;
      if (!entry) continue;
      next.push({
        id: entry.id,
        slug: `${prefix}${entry.slug}`,
        icon: entry.icon,
        sourcePath: entry.sourcePath,
        terms: entry.terms,
      });
    }
    next.sort((a, b) => a.id.localeCompare(b.id));
    targetsCache = next;
  }

  function syncCache(): boolean {
    const stats = scanMdFileStats({ roots });
    const statsMap = new Map(stats.map(item => [item.path, item]));

    let changed = false;

    for (const existing of Array.from(cache.keys())) {
      if (!statsMap.has(existing)) {
        const prev = cache.get(existing);
        if (prev?.entry) changed = true;
        cache.delete(existing);
      }
    }

    for (const stat of stats) {
      const previous = cache.get(stat.path);
      if (previous && previous.mtimeMs === stat.mtimeMs) {
        continue;
      }

      let entry: IndexRawEntry | undefined;
      try {
        const content = readFileSync(stat.path, 'utf8');
        ({ entry } = parseFrontmatterFile({
          path: stat.path,
          content,
          ext: stat.ext,
        }));
      } catch {
        if (previous?.entry) changed = true;
        cache.delete(stat.path);
        continue;
      }

      if (!entriesEqual(previous?.entry, entry)) {
        changed = true;
      }

      cache.set(stat.path, {
        mtimeMs: stat.mtimeMs,
        entry,
      });
    }

    return changed;
  }

  return {
    getAllTargets() {
      const cacheChanged = syncCache();
      if (cacheChanged || targetsCache === null) {
        rebuildTargets();
      }
      return targetsCache ?? [];
    },
    getCurrentFilePath(file) {
      return file.path || '';
    },
  };
}
