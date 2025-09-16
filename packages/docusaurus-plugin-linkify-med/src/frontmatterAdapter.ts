import type { RawDocFile, FrontmatterParseResult } from './types.js';
import { parseFrontmatter } from './frontmatter.js';

/**
 * Thin adapter kept for future evolution (e.g., integrating with Docusaurus content files).
 * For now, it simply delegates to parseFrontmatter.
 */
export function loadIndexFromFiles(files: RawDocFile[]): FrontmatterParseResult {
  return parseFrontmatter(files);
}
