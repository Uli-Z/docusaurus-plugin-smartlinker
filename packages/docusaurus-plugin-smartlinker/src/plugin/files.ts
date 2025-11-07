import type { RawDocFile } from '../types.js';
import { scanMdFiles } from '../node/fsScan.js';

type ResolvedFolderLike = { absPath: string; id: string };

export function createCollectFiles(
  resolvedFolders: ResolvedFolderLike[],
  scanLogger: { isLevelEnabled(level: string): boolean; debug: Function; trace: Function },
  startTimer: (log: { isLevelEnabled(level: string): boolean }, ...levels: string[]) => number | null,
  endTimer: (start: number | null) => number | undefined,
  toSiteRel: (absPath: string) => string,
  setScannedCount: (n: number) => void,
): () => RawDocFile[] {
  return () => {
    const start = startTimer(scanLogger as any, 'debug', 'info');
    const files: RawDocFile[] = [];
    for (const folder of resolvedFolders) {
      const scanned = scanMdFiles({ roots: [folder.absPath] });
      for (const file of scanned) {
        files.push({ ...file, folderId: folder.id });
      }
    }
    // Fill folderId properly (since scanMdFiles doesn’t know ids)
    // The caller is expected to map folderId afterwards if needed.
    setScannedCount(files.length);

    if (scanLogger.isLevelEnabled('debug')) {
      scanLogger.debug('Scanned SmartLink folders', {
        folderCount: resolvedFolders.length,
        fileCount: files.length,
        durationMs: endTimer(start),
      });
    }

    if (scanLogger.isLevelEnabled('trace') && files.length > 0) {
      scanLogger.trace('Collected SmartLink files', () => ({
        files: files.map((file) => toSiteRel(file.path)),
      }));
    }

    return files;
  };
}
