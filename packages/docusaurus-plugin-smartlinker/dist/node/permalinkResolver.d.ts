import type { LoadedContent as DocsLoadedContent } from '@docusaurus/plugin-content-docs';
import type { IndexRawEntry } from '../types.js';
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
    entries: Array<IndexRawEntry & {
        docId?: string | null;
    }>;
    docsContent?: Record<string, DocsLoadedContent | undefined> | undefined;
}
export declare function resolveEntryPermalinks(options: ResolvePermalinkOptions): EntryWithResolvedUrl[];
//# sourceMappingURL=permalinkResolver.d.ts.map