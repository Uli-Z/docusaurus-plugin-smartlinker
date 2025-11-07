import type { RawDocFile, IndexRawEntry } from '../types.js';

export function createPrimeIndexProvider(deps: {
  indexLogger: { isLevelEnabled(level: string): boolean; debug: Function; trace: Function };
  collectFiles: () => RawDocFile[];
  loadIndexFromFiles: (files: RawDocFile[]) => { entries: IndexRawEntry[] };
  applyFolderDefaults: (entries: IndexRawEntry[]) => void;
  setIndexEntries: (entries: IndexRawEntry[]) => void;
  entryState: { refresh: (entries: IndexRawEntry[]) => void };
  stats: { entryCount: number };
  recordIndexBuildMs: (ms: number) => void;
  startTimer: (log: { isLevelEnabled(level: string): boolean }, ...levels: string[]) => number | null;
  endTimer: (start: number | null) => number | undefined;
}) {
  const {
    indexLogger,
    collectFiles,
    loadIndexFromFiles,
    applyFolderDefaults,
    setIndexEntries,
    entryState,
    stats,
    recordIndexBuildMs,
    startTimer,
    endTimer,
  } = deps;

  return () => {
    const start = startTimer(indexLogger as any, 'debug', 'info');
    const files = collectFiles();
    const indexBuildStart = Date.now();
    const { entries } = loadIndexFromFiles(files);
    applyFolderDefaults(entries);
    setIndexEntries(entries);
    entryState.refresh(entries);
    stats.entryCount = entries.length;
    recordIndexBuildMs(Date.now() - indexBuildStart);

    if (indexLogger.isLevelEnabled('debug')) {
      indexLogger.debug('Primed SmartLink index provider', {
        entryCount: entries.length,
        durationMs: endTimer(start),
      });
    }

    if (indexLogger.isLevelEnabled('trace') && entries.length > 0) {
      indexLogger.trace('Primed entry identifiers', () => ({
        entryIds: entries.map((entry) => entry.id),
      }));
    }

    return files;
  };
}

