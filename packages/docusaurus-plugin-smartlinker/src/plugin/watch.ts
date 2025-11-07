import { isAbsolute, relative } from 'node:path';
import { normalizeFsPath } from './paths.js';

type ResolvedFolderLike = { absPath: string };

export function buildWatchPattern(siteDir: string, absPath: string): string {
  const normalized = normalizeFsPath(siteDir, absPath).replace(/\/+$/, '');
  return `${normalized}/**/*.{md,mdx}`;
}

export function getPathsToWatch(siteDir: string, resolvedFolders: ResolvedFolderLike[]): string[] {
  const patterns = new Set<string>();
  for (const folder of resolvedFolders) {
    patterns.add(buildWatchPattern(siteDir, folder.absPath));
  }
  return Array.from(patterns);
}

function isPathWithinFolder(absPath: string, resolvedFolders: ResolvedFolderLike[]): boolean {
  for (const folder of resolvedFolders) {
    const relPath = relative(folder.absPath, absPath);
    if (!relPath || (!relPath.startsWith('..') && !isAbsolute(relPath))) {
      return true;
    }
  }
  return false;
}

export function filterRelevantPaths(
  siteDir: string,
  paths: string[],
  resolvedFolders: ResolvedFolderLike[],
): Set<string> {
  const relevant = new Set<string>();
  for (const candidate of paths) {
    if (!candidate) continue;
    const absPath = normalizeFsPath(siteDir, candidate);
    if (isPathWithinFolder(absPath, resolvedFolders)) {
      relevant.add(absPath);
    }
  }
  return relevant;
}

// Types for composing a watch handler from the plugin
export type OnFilesChangeParams = {
  changedFiles: string[];
  deletedFiles: string[];
};

export type OnFilesChangeDeps<TEntry> = {
  siteDir: string;
  resolvedFolders: ResolvedFolderLike[];
  watchLogger: { isLevelEnabled(level: string): boolean; info: Function; debug: Function; warn: Function; trace: Function };
  collectFiles: () => TEntry[];
  loadIndexFromFiles: (files: any[]) => { entries: any };
  applyFolderDefaults: (entries: any[]) => void;
  recordIndexBuildMs: (ms: number) => void;
  setIndexEntries: (entries: any[]) => void;
  entryState: { diff: (nextEntries: any[], impactedPaths: Set<string>) => { impactedTermIds: Set<string>; addedTermIds: Set<string>; removedTermIds: Set<string>; changedTermIds: Set<string> }; refresh: (entries: any[]) => void };
  getDocsReferencingTerms: (ids: Set<string>) => Iterable<string>;
  existsSync: (p: string) => boolean;
  utimesSync: (p: string, atime: Date, mtime: Date) => void;
  toSiteRel: (absPath: string) => string;
  normalizePath: (p: string) => string;
  startTimer: (log: { isLevelEnabled(level: string): boolean }, ...levels: string[]) => number | null;
  endTimer: (start: number | null) => number | undefined;
  stats: { scannedFileCount: number; entryCount: number };
};

export function createOnFilesChangeHandler(deps: OnFilesChangeDeps<any>) {
  return async function onFilesChange({ changedFiles, deletedFiles }: OnFilesChangeParams) {
    const candidates = [...(changedFiles ?? []), ...(deletedFiles ?? [])];
    const relevantPaths = filterRelevantPaths(deps.siteDir, candidates, deps.resolvedFolders);

    if (relevantPaths.size === 0) {
      if (deps.watchLogger.isLevelEnabled('trace')) {
        deps.watchLogger.trace('No SmartLink folders affected by file change', () => ({
          changedFiles: changedFiles ?? [],
          deletedFiles: deletedFiles ?? [],
        }));
      }
      return;
    }

    const start = deps.startTimer(deps.watchLogger as any, 'info', 'debug');
    const files = deps.collectFiles();
    deps.stats.scannedFileCount = files.length;

    const indexBuildStart = Date.now();
    const { entries } = deps.loadIndexFromFiles(files);
    deps.applyFolderDefaults(entries);
    deps.recordIndexBuildMs(Date.now() - indexBuildStart);

    const { impactedTermIds, addedTermIds, removedTermIds, changedTermIds } = deps.entryState.diff(
      entries,
      relevantPaths,
    );

    deps.setIndexEntries(entries);
    deps.entryState.refresh(entries);
    deps.stats.entryCount = entries.length;

    const docsForReload = new Set<string>(deps.getDocsReferencingTerms(changedTermIds));
    const touchedDocs: string[] = [];
    if (docsForReload.size > 0) {
      const now = new Date();
      for (const docPath of docsForReload) {
        const absDocPath = deps.normalizePath(docPath);
        if (!deps.existsSync(absDocPath)) continue;
        try {
          deps.utimesSync(absDocPath, now, now);
          touchedDocs.push(absDocPath);
        } catch (error) {
          if (deps.watchLogger.isLevelEnabled('warn')) {
            deps.watchLogger.warn('Failed to mark SmartLink consumer for rebuild', () => ({
              file: deps.toSiteRel(absDocPath),
              error: error instanceof Error ? error.message : String(error),
            }));
          }
        }
      }
    }

    if (deps.watchLogger.isLevelEnabled('info')) {
      deps.watchLogger.info('SmartLink watch rebuild complete', {
        scannedFileCount: files.length,
        changedTermCount: changedTermIds.size,
        addedTermCount: addedTermIds.size,
        removedTermCount: removedTermIds.size,
        rebuiltDocCount: touchedDocs.length,
        durationMs: deps.endTimer(start),
      });
    }

    if (deps.watchLogger.isLevelEnabled('debug')) {
      deps.watchLogger.debug('SmartLink watch diff', () => ({
        triggeredBy: Array.from(relevantPaths).map((p) => deps.toSiteRel(p)),
        impactedTermIds: Array.from(impactedTermIds),
        changedTermIds: Array.from(changedTermIds),
        addedTermIds: Array.from(addedTermIds),
        removedTermIds: Array.from(removedTermIds),
        rebuiltDocs: touchedDocs.map((p) => deps.toSiteRel(p)),
      }));
    }
  };
}

