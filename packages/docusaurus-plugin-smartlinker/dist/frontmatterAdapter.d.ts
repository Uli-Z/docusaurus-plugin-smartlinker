import type { RawDocFile, FrontmatterParseResult } from './types.js';
/**
 * Thin adapter kept for future evolution (e.g., integrating with Docusaurus content files).
 * For now, it simply delegates to parseFrontmatter.
 */
export declare function loadIndexFromFiles(files: RawDocFile[]): FrontmatterParseResult;
//# sourceMappingURL=frontmatterAdapter.d.ts.map