export interface RawDocFile {
  /** Absolute or repo-relative path; used only for warnings + proximity in later milestones */
  path: string;
  /** File content as UTF-8 string */
  content: string;
  /** Optional explicit extension override; otherwise infer from path. */
  ext?: '.md' | '.mdx';
}

export interface IndexRawEntry {
  id: string;
  slug: string;
  synonyms: string[];     // normalized: trimmed, unique, lower-case for matching in later milestones
  linkify: boolean;       // default true
  icon?: string;
  shortNote?: string;     // trimmed MDX string (not compiled here)
  /** Source file path (for proximity resolution, warnings later) */
  sourcePath: string;
}

export interface FrontmatterWarning {
  path: string;
  code:
    | 'UNSUPPORTED_EXT'
    | 'LINKIFY_FALSE'
    | 'MISSING_REQUIRED'
    | 'INVALID_TYPE'
    | 'EMPTY_SYNONYMS'
    | 'EMPTY_ID'
    | 'EMPTY_SLUG';
  message: string;
  details?: Record<string, unknown>;
}

export interface FrontmatterParseResult {
  entries: IndexRawEntry[];
  warnings: FrontmatterWarning[];
}
