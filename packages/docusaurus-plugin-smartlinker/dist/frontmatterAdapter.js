import { parseFrontmatter } from './frontmatter.js';
/**
 * Thin adapter kept for future evolution (e.g., integrating with Docusaurus content files).
 * For now, it simply delegates to parseFrontmatter.
 */
export function loadIndexFromFiles(files) {
    return parseFrontmatter(files);
}
//# sourceMappingURL=frontmatterAdapter.js.map