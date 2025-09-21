export interface RawDocFile {
    /** Absolute or repo-relative path; used only for warnings + proximity in later milestones */
    path: string;
    /** File content as UTF-8 string */
    content: string;
    /** Optional explicit extension override; otherwise infer from path. */
    ext?: '.md' | '.mdx';
    /** Identifier of the configured folder that sourced this file. */
    folderId?: string;
}
export interface IndexRawEntry {
    id: string;
    slug: string;
    terms: string[];
    linkify: boolean;
    icon?: string;
    shortNote?: string;
    /** Source file path (for proximity resolution, warnings later) */
    sourcePath: string;
    /** Identifier of the configured folder that produced this entry. */
    folderId?: string;
}
export interface FrontmatterWarning {
    path: string;
    code: 'UNSUPPORTED_EXT' | 'LINKIFY_FALSE' | 'MISSING_REQUIRED' | 'INVALID_TYPE' | 'EMPTY_SMARTLINK_TERMS' | 'EMPTY_ID' | 'EMPTY_SLUG';
    message: string;
    details?: Record<string, unknown>;
}
export interface FrontmatterParseResult {
    entries: IndexRawEntry[];
    warnings: FrontmatterWarning[];
}
//# sourceMappingURL=types.d.ts.map