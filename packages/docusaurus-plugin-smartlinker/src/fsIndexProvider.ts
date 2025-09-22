import { scanMdFiles } from './node/fsScan.js';
import { loadIndexFromFiles } from './frontmatterAdapter.js';

export interface FsIndexProviderOptions {
  roots: string[]; // absolute directories to scan
}

export interface TargetInfo {
  id: string;
  slug: string;
  icon?: string;
  sourcePath: string;
  terms: string[];
  folderId?: string | null;
}

export interface IndexProvider {
  getAllTargets(): TargetInfo[];
  getCurrentFilePath(file: { path?: string }): string;
}

/**
 * Create a docusaurus-plugin-smartlinker/remark IndexProvider by scanning the file system
 * for MD/MDX files and parsing their frontmatter.
 */
export function createFsIndexProvider(opts: FsIndexProviderOptions): IndexProvider {
  const resolvedRoots = (opts.roots ?? []).map((root) => {
    const normalized = root.replace(/\\/g, '/').replace(/\/+$/, '');
    return { path: root, id: normalized || '.' };
  });

  const files = resolvedRoots.flatMap((root) => {
    const scanned = scanMdFiles({ roots: [root.path] });
    return scanned.map((file) => ({ ...file, folderId: root.id }));
  });

  const { entries } = loadIndexFromFiles(files);

  const targets: TargetInfo[] = entries.map(e => ({
    id: e.id,
    slug: e.slug,
    icon: e.icon,
    sourcePath: e.sourcePath,
    terms: e.terms,
    folderId: e.folderId ?? null,
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
