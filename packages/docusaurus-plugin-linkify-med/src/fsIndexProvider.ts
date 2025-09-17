import { scanMdFiles } from './node/fsScan.js';
import { loadIndexFromFiles } from './frontmatterAdapter.js';

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
export function createFsIndexProvider(opts: FsIndexProviderOptions): IndexProvider {
  const files = scanMdFiles({ roots: opts.roots });
  const { entries } = loadIndexFromFiles(files);

  const prefix = opts.slugPrefix ?? '';
  const targets: TargetInfo[] = entries.map(e => ({
    id: e.id,
    slug: `${prefix}${e.slug}`,
    icon: e.icon,
    sourcePath: e.sourcePath,
    terms: e.terms,
  }));

  return {
    getAllTargets() {
      return targets;
    },
    getCurrentFilePath(file) {
      return file.path || '';
    },
  };
}
