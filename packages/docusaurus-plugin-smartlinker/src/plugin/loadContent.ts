import { Buffer } from 'node:buffer';
import type { NormalizedOptions } from '../options.js';
import type { IndexRawEntry, RawDocFile } from '../types.js';
import type { NoteModule } from '../codegen/notesEmitter.js';
import type { RegistryModule } from '../codegen/registryEmitter.js';

export function createLoadContent(deps: {
  context: any;
  normOpts: NormalizedOptions;
  loadLogger: { isLevelEnabled(level: string): boolean; info: Function; debug: Function; trace: Function };
  watchLogger: { isLevelEnabled(level: string): boolean; info: Function; debug: Function; warn: Function };
  collectFiles: () => RawDocFile[];
  createTooltipMdxCompiler: (context: any) => Promise<(code: string) => Promise<{ value: unknown }>>;
  buildArtifacts: (files: RawDocFile[], ctx: { compileMdx: any }) => Promise<{ entries: IndexRawEntry[]; notes: NoteModule[]; registry: RegistryModule }>;
  recordIndexBuildMs: (ms: number) => void;
  applyFolderDefaults: (entries: IndexRawEntry[]) => void;
  setIndexEntries: (entries: IndexRawEntry[]) => void;
  entryState: { diff: (next: IndexRawEntry[], impacted: Set<string>) => { changedTermIds: Set<string>; addedTermIds: Set<string>; removedTermIds: Set<string> }; refresh: (entries: IndexRawEntry[]) => void };
  getDocsReferencingTerms: (ids: Set<string>) => Iterable<string>;
  normalizePath: (p: string) => string;
  existsSync: (p: string) => boolean;
  utimesSync: (p: string, a: Date, m: Date) => void;
  toSiteRel: (p: string) => string;
  stats: { entryCount: number; noteCount: number; registryBytes: number; reusedPrimedFiles: boolean; scannedFileCount: number };
  startTimer: (log: { isLevelEnabled(level: string): boolean }, ...levels: string[]) => number | null;
  endTimer: (start: number | null) => number | undefined;
  primedRef: { current: RawDocFile[] | null };
}) {
  const {
    context,
    normOpts,
    loadLogger,
    watchLogger,
    collectFiles,
    createTooltipMdxCompiler,
    buildArtifacts,
    recordIndexBuildMs,
    applyFolderDefaults,
    setIndexEntries,
    entryState,
    getDocsReferencingTerms,
    normalizePath,
    existsSync,
    utimesSync,
    toSiteRel,
    stats,
    startTimer,
    endTimer,
    primedRef,
  } = deps;

  return async (): Promise<{ entries: IndexRawEntry[]; notes: NoteModule[]; registry: RegistryModule; opts: NormalizedOptions }> => {
    const usingPrimed = primedRef.current !== null;
    const start = startTimer(loadLogger as any, 'info', 'debug');
    const files = primedRef.current ?? collectFiles();
    primedRef.current = null;
    stats.reusedPrimedFiles = usingPrimed;
    stats.scannedFileCount = files.length;

    if (loadLogger.isLevelEnabled('debug')) {
      loadLogger.debug('Building SmartLink artifacts', {
        fileCount: files.length,
        reusedPrimedFiles: usingPrimed,
      });
    }

    if (loadLogger.isLevelEnabled('trace') && files.length > 0) {
      loadLogger.trace('Processing SmartLink files', () => ({
        files: files.map((file) => toSiteRel(file.path)),
      }));
    }

    const compileMdx = await createTooltipMdxCompiler(context);
    const indexBuildStart = Date.now();
    const { entries, notes, registry } = await buildArtifacts(files, {
      compileMdx,
    });
    recordIndexBuildMs(Date.now() - indexBuildStart);

    stats.entryCount = entries.length;
    stats.noteCount = notes.length;
    stats.registryBytes = Buffer.byteLength(registry.contents, 'utf8');

    applyFolderDefaults(entries);
    setIndexEntries(entries);

    try {
      const { changedTermIds, addedTermIds, removedTermIds } = entryState.diff(
        entries,
        new Set<string>(),
      );
      if (changedTermIds.size > 0) {
        const docsForReload = new Set<string>(getDocsReferencingTerms(changedTermIds));
        const touchedDocs: string[] = [];
        if (docsForReload.size > 0) {
          const now = new Date();
          for (const docPath of docsForReload) {
            const absDocPath = normalizePath(docPath);
            if (!existsSync(absDocPath)) continue;
            try {
              utimesSync(absDocPath, now, now);
              touchedDocs.push(absDocPath);
            } catch (error) {
              if (watchLogger.isLevelEnabled('warn')) {
                watchLogger.warn('Failed to mark SmartLink consumer for rebuild', () => ({
                  file: toSiteRel(absDocPath),
                  error: error instanceof Error ? error.message : String(error),
                }));
              }
            }
          }
        }

        if (watchLogger.isLevelEnabled('info')) {
          watchLogger.info('Detected SmartLink term changes', {
            changedTermCount: changedTermIds.size,
            addedTermCount: addedTermIds.size,
            removedTermCount: removedTermIds.size,
            rebuiltDocCount: touchedDocs.length,
          });
        }

        if (watchLogger.isLevelEnabled('debug')) {
          watchLogger.debug('SmartLink change details', () => ({
            changedTermIds: Array.from(changedTermIds),
            addedTermIds: Array.from(addedTermIds),
            removedTermIds: Array.from(removedTermIds),
            rebuiltDocs: touchedDocs.map((p) => toSiteRel(p)),
          }));
        }
      }
    } catch (err) {
      if (watchLogger.isLevelEnabled('warn')) {
        watchLogger.warn('SmartLink change detection failed', () => ({
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }

    entryState.refresh(entries);

    if (loadLogger.isLevelEnabled('info')) {
      loadLogger.info('Completed SmartLink artifact build', {
        entryCount: entries.length,
        noteCount: notes.length,
        durationMs: endTimer(start),
      });
    }

    if (loadLogger.isLevelEnabled('debug')) {
      loadLogger.debug('Registry artifacts prepared', {
        registryBytes: stats.registryBytes,
      });
    }

    if (loadLogger.isLevelEnabled('trace') && entries.length > 0) {
      loadLogger.trace('Generated SmartLink entries', () => ({
        entryIds: entries.map((entry) => entry.id),
        noteFiles: notes.map((note) => note.filename),
      }));
    }

    return { entries, notes, registry, opts: normOpts };
  };
}
