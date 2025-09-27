import { relative } from 'node:path';
function toAliasedSitePath(siteDir, absPath) {
    if (!absPath)
        return null;
    const rel = relative(siteDir, absPath);
    if (!rel || rel.startsWith('..'))
        return null;
    return `@site/${rel.replace(/\\/g, '/')}`;
}
function buildDocLookups(docsContent) {
    const byDocId = new Map();
    const bySource = new Map();
    const byFrontmatterId = new Map();
    const bySlug = new Map();
    const byPermalink = new Map();
    if (!docsContent) {
        return { byDocId, bySource, byFrontmatterId, bySlug, byPermalink };
    }
    const register = (doc) => {
        if (!doc)
            return;
        if (doc.id && !byDocId.has(doc.id))
            byDocId.set(doc.id, doc);
        if (doc.source) {
            const normalized = doc.source.replace(/\\/g, '/');
            if (!bySource.has(normalized))
                bySource.set(normalized, doc);
        }
        const fmId = doc?.frontMatter?.id;
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
        if (!content)
            continue;
        const versions = (content.loadedVersions ?? []);
        for (const version of versions) {
            const docs = (version.docs ?? []);
            for (const doc of docs)
                register(doc);
        }
    }
    return { byDocId, bySource, byFrontmatterId, bySlug, byPermalink };
}
export function resolveEntryPermalinks(options) {
    const { entries, siteDir, docsContent } = options;
    const lookups = buildDocLookups(docsContent);
    return entries.map((entry) => {
        const alias = toAliasedSitePath(siteDir, entry.sourcePath);
        let doc;
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
        };
    });
}
//# sourceMappingURL=permalinkResolver.js.map