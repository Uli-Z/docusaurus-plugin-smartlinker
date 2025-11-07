import { relative } from 'node:path';
import type {
  LoadedContent as DocsLoadedContent,
  LoadedVersion as DocsLoadedVersion,
  DocMetadata as DocsDocMetadata,
} from '@docusaurus/plugin-content-docs';
import type { IndexRawEntry } from '../types.js';
import type { ContextLogger } from '../logger.js';

export interface EntryWithResolvedUrl {
  id: string;
  slug: string;
  icon?: string;
  folderId?: string;
  docId?: string | null;
  permalink?: string;
}

export interface ResolvePermalinkOptions {
  siteDir: string;
  entries: Array<IndexRawEntry & { docId?: string | null }>;
  docsContent?: Record<string, DocsLoadedContent | undefined> | undefined;
}

function toAliasedSitePath(siteDir: string, absPath: string | undefined): string | null {
  if (!absPath) return null;
  const rel = relative(siteDir, absPath);
  if (!rel || rel.startsWith('..')) return null;
  return `@site/${rel.replace(/\\/g, '/')}`;
}

interface DocLookups {
  byDocId: Map<string, DocsDocMetadata>;
  bySource: Map<string, DocsDocMetadata>;
  byFrontmatterId: Map<string, DocsDocMetadata>;
  bySlug: Map<string, DocsDocMetadata>;
  byPermalink: Map<string, DocsDocMetadata>;
}

function buildDocLookups(
  docsContent: Record<string, DocsLoadedContent | undefined> | undefined,
): DocLookups {
  const byDocId = new Map<string, DocsDocMetadata>();
  const bySource = new Map<string, DocsDocMetadata>();
  const byFrontmatterId = new Map<string, DocsDocMetadata>();
  const bySlug = new Map<string, DocsDocMetadata>();
  const byPermalink = new Map<string, DocsDocMetadata>();

  if (!docsContent) {
    return { byDocId, bySource, byFrontmatterId, bySlug, byPermalink };
  }

  const register = (doc: DocsDocMetadata | undefined) => {
    if (!doc) return;
    if (doc.id && !byDocId.has(doc.id)) byDocId.set(doc.id, doc);
    if (doc.source) {
      const normalized = doc.source.replace(/\\/g, '/');
      if (!bySource.has(normalized)) bySource.set(normalized, doc);
    }
    const fmId = (doc as any)?.frontMatter?.id;
    if (typeof fmId === 'string' && fmId.trim() && !byFrontmatterId.has(fmId.trim())) {
      byFrontmatterId.set(fmId.trim(), doc);
    }
    if (doc.slug && doc.slug.trim() && !bySlug.has(doc.slug.trim())) {
      bySlug.set(doc.slug.trim(), doc);
    }
    if (doc.permalink && doc.permalink.trim() && !byPermalink.has(doc.permalink.trim())) {
      byPermalink.set(doc.permalink.trim(), doc);
    }
  };

  for (const content of Object.values(docsContent)) {
    if (!content) continue;
    const versions = (content.loadedVersions ?? []) as DocsLoadedVersion[];
    for (const version of versions) {
      const docs = (version.docs ?? []) as DocsDocMetadata[];
      for (const doc of docs) register(doc);
    }
  }

  return { byDocId, bySource, byFrontmatterId, bySlug, byPermalink };
}

/**
 * Pluggable lookup provider for docs metadata.
 * Implementation A: load from generated JSON (current behavior).
 * Implementation B: consume injected metadata (e.g., from another plugin).
 */
export interface DocsLookupProvider {
  getLookups(): DocLookups;
}

export function createContentLookupProvider(
  docsContent: Record<string, DocsLoadedContent | undefined> | undefined,
): DocsLookupProvider {
  return {
    getLookups() {
      return buildDocLookups(docsContent);
    },
  };
}

export function resolveEntryPermalinks(options: ResolvePermalinkOptions): EntryWithResolvedUrl[] {
  const { entries, siteDir, docsContent } = options;
  const lookups = buildDocLookups(docsContent);

  return entries.map((entry) => {
    const alias = toAliasedSitePath(siteDir, entry.sourcePath);

    let doc: DocsDocMetadata | undefined;

    if (entry.docId) {
      doc = lookups.byDocId.get(entry.docId);
    }

    if (!doc && alias) {
      doc = lookups.bySource.get(alias);
    }

    if (!doc) {
      doc = lookups.byFrontmatterId.get(entry.id);
    }

    if (!doc && entry.slug) {
      doc = lookups.bySlug.get(entry.slug) ?? lookups.byPermalink.get(entry.slug);
    }

    const permalink = doc?.permalink ? doc.permalink.trim() : undefined;
    const docId = entry.docId ?? doc?.id ?? null;

    return {
      id: entry.id,
      slug: entry.slug,
      icon: entry.icon,
      folderId: entry.folderId,
      docId,
      permalink,
    } satisfies EntryWithResolvedUrl;
  });
}

export function resolveEntryPermalinksUsingProvider(args: {
  siteDir: string;
  entries: Array<IndexRawEntry & { docId?: string | null }>;
  provider: DocsLookupProvider;
  permalinkLogger?: ContextLogger;
}): EntryWithResolvedUrl[] {
  const { siteDir, entries, provider, permalinkLogger } = args;
  const lookups = provider.getLookups();
  const hasAnyLookupData =
    lookups.byDocId.size > 0 ||
    lookups.bySource.size > 0 ||
    lookups.byFrontmatterId.size > 0 ||
    lookups.bySlug.size > 0 ||
    lookups.byPermalink.size > 0;

  if (!hasAnyLookupData && permalinkLogger?.isLevelEnabled('warn')) {
    permalinkLogger.warn('No docs metadata available for permalink resolution');
  }

  return entries.map((entry) => {
    const alias = toAliasedSitePath(siteDir, entry.sourcePath);

    let doc: DocsDocMetadata | undefined;

    if (entry.docId) {
      doc = lookups.byDocId.get(entry.docId);
    }

    if (!doc && alias) {
      doc = lookups.bySource.get(alias);
    }

    if (!doc) {
      doc = lookups.byFrontmatterId.get(entry.id);
    }

    if (!doc && entry.slug) {
      doc = lookups.bySlug.get(entry.slug) ?? lookups.byPermalink.get(entry.slug);
    }

    const permalink = doc?.permalink ? doc.permalink.trim() : undefined;
    const docId = entry.docId ?? doc?.id ?? null;

    return {
      id: entry.id,
      slug: entry.slug,
      icon: entry.icon,
      folderId: entry.folderId,
      docId,
      permalink,
    } satisfies EntryWithResolvedUrl;
  });
}
