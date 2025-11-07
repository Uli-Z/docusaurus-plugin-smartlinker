import type { IndexRawEntry } from '../types.js';

type Folder = { absPath: string; id: string; defaultIcon?: string };

export function createApplyFolderDefaults(
  folderById: Map<string, Folder>,
  icons: Record<string, unknown>,
) {
  return (entries: IndexRawEntry[]) => {
    for (const entry of entries) {
      const folder = entry.folderId ? folderById.get(entry.folderId) : undefined;
      if (!folder) continue;
      if (!entry.icon && folder.defaultIcon && icons[folder.defaultIcon]) {
        entry.icon = folder.defaultIcon;
      }
    }
  };
}

export function createComputeDocIdForEntry(folderById: Map<string, Folder>) {
  return (entry: IndexRawEntry): string | undefined => {
    const folder = entry.folderId ? folderById.get(entry.folderId) : undefined;
    if (!folder) return undefined;
    return deriveDocId(folder.absPath, entry.sourcePath);
  };
}

import { relative } from 'node:path';

export function deriveDocId(folderAbsPath: string, sourcePath: string | undefined): string | undefined {
  if (!sourcePath) return undefined;
  const rel = relative(folderAbsPath, sourcePath);
  if (!rel || rel.startsWith('..')) return undefined;
  const normalized = rel.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.[^./]+$/u, '');
  return withoutExt || undefined;
}
