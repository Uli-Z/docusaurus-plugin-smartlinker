import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { readdirSync, readFileSync, statSync, existsSync, utimesSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import type { Plugin } from '@docusaurus/types';
import type { LoadContext, PluginContentLoadedActions } from '@docusaurus/types';
import {
  validateOptions,
  type PluginOptions,
  type NormalizedOptions,
  type NormalizedFolderOption,
} from './options.js';
import { scanMdFiles } from './node/fsScan.js';
import { buildArtifacts } from './node/buildPipeline.js';
import type { IndexRawEntry, RawDocFile } from './types.js';
import type { NoteModule } from './codegen/notesEmitter.js';
import type { RegistryModule } from './codegen/registryEmitter.js';
import { emitTooltipComponentsModule } from './codegen/tooltipComponentsEmitter.js';
import { PLUGIN_NAME } from './pluginName.js';
import { createTooltipMdxCompiler } from './node/tooltipMdxCompiler.js';
import { setIndexEntries } from './indexProviderStore.js';
import { loadIndexFromFiles } from './frontmatterAdapter.js';
import { resolveEntryPermalinks, type EntryWithResolvedUrl } from './node/permalinkResolver.js';
import type { LoadedContent as DocsLoadedContent } from '@docusaurus/plugin-content-docs';
import { resolveDebugConfig, createLogger, type LogLevel } from './logger.js';
import { setDebugConfig } from './debugStore.js';
import {
  recordIndexBuildMs,
  resetMetrics,
  consumeIndexBuildMs,
  consumeTermProcessingMs,
} from './metricsStore.js';
import { getDocsReferencingTerms } from './termUsageStore.js';

export type {
  FsIndexProviderOptions,
  IndexProvider,
  TargetInfo,
} from './fsIndexProvider.js';
export { createFsIndexProvider } from './fsIndexProvider.js';
export { PLUGIN_NAME } from './pluginName.js';
export { getIndexProvider } from './indexProviderStore.js';
// Re-export logger utilities for reuse by the remark package
export { resolveDebugConfig, createLogger, type LogLevel } from './logger.js';
export type { DebugOptions } from './options.js';
export { getDebugConfig, setDebugConfig } from './debugStore.js';
export {
  recordIndexBuildMs,
  resetMetrics,
  resetTermProcessingMs,
  recordTermProcessingMs,
  resetIndexBuildMs,
  consumeIndexBuildMs,
  consumeTermProcessingMs,
  getIndexBuildMs,
  getTermProcessingMs,
} from './metricsStore.js';
export { updateDocTermUsage, removeDocTermUsage, resetTermUsage } from './termUsageStore.js';

export type { PluginOptions } from './options.js';

type Content = {
  entries: IndexRawEntry[];
  notes: NoteModule[];
  registry: RegistryModule;
  opts: NormalizedOptions;
};

type ResolvedFolder = NormalizedFolderOption & {
  absPath: string;
  id: string;
};

type OnFilesChangeParams = {
  changedFiles: string[];
  deletedFiles: string[];
};

type WatchCapablePlugin<Content> = Plugin<Content> & {
  onFilesChange?: (params: OnFilesChangeParams) => Promise<void> | void;
};

function normalizeFolderId(siteDir: string, absPath: string): string {
  const relPath = relative(siteDir, absPath);
  const useRelative =
    relPath &&
    !relPath.startsWith('..') &&
    !isAbsolute(relPath);
  const candidate = useRelative ? relPath : absPath;
  const normalized = candidate.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized || '.';
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const pluginName = PLUGIN_NAME;

function publishGlobalData(
  actions: PluginContentLoadedActions,
  opts: NormalizedOptions,
  entries: EntryWithResolvedUrl[],
) {
  const registryMeta = entries.map(({ id, slug, icon, folderId, docId, permalink }) => ({
    id,
    slug,
    icon: icon ?? null,
    folderId: folderId ?? null,
    docId: docId ?? null,
    permalink: permalink ?? null,
  }));

  actions.setGlobalData({ options: opts, entries: registryMeta });
}

export default function smartlinkerPlugin(
  _context: LoadContext,
  optsIn?: PluginOptions
): Plugin<Content> {
  const { options: validatedOptions, warnings } = validateOptions(optsIn);
  const debugResolution = resolveDebugConfig(validatedOptions.debug);
  const normOpts: NormalizedOptions = {
    ...validatedOptions,
    debug: debugResolution.config,
  };

  // Make debug configuration available globally so the remark transformer
  // can mirror the same logging behavior without separate config.
  setDebugConfig(normOpts.debug);
  resetMetrics();

  if (normOpts.folders.length === 0) {
    throw new Error(
      `[${pluginName}] Configure at least one folder via the \`folders\` option.`
    );
  }

  const logger = createLogger({ pluginName, debug: normOpts.debug });
  const initLogger = logger.child('init');
  const optionsLogger = logger.child('options');
  const scanLogger = logger.child('scan');
  const indexLogger = logger.child('index');
  const loadLogger = logger.child('loadContent');
  const contentLogger = logger.child('contentLoaded');
  const webpackLogger = logger.child('configureWebpack');
  const postBuildLogger = logger.child('postBuild');
  const watchLogger = logger.child('watch');

  const stats = {
    scannedFileCount: 0,
    entryCount: 0,
    noteCount: 0,
    resolvedCount: 0,
    reusedPrimedFiles: false,
    registryBytes: 0,
    indexBuildMs: 0,
    termProcessingMs: 0,
  };

  const shouldMeasure = (
    log: { isLevelEnabled(level: LogLevel): boolean },
    ...levels: LogLevel[]
  ): boolean => levels.some((level) => log.isLevelEnabled(level));

  const startTimer = (
    log: { isLevelEnabled(level: LogLevel): boolean },
    ...levels: LogLevel[]
  ): number | null => (shouldMeasure(log, ...levels) ? performance.now() : null);

  const endTimer = (start: number | null): number | undefined => {
    if (start === null) return undefined;
    return Number((performance.now() - start).toFixed(2));
  };

  const formatSiteRelativePath = (absPath: string): string => {
    const relPath = relative(_context.siteDir, absPath);
    const useRel = relPath && !relPath.startsWith('..') && !isAbsolute(relPath);
    const normalized = (useRel ? relPath : absPath).replace(/\\/g, '/');
    return normalized || '.';
  };

  if (
    debugResolution.invalidLevel &&
    typeof console !== 'undefined' &&
    typeof console.warn === 'function'
  ) {
    console.warn(
      `[${pluginName}] Ignoring DOCUSAURUS_PLUGIN_DEBUG_LEVEL="${debugResolution.invalidLevel}" (expected one of: error, warn, info, debug, trace).`
    );
  }

  if (normOpts.debug.enabled && initLogger.isLevelEnabled('info')) {
    initLogger.info('Debug mode enabled', {
      level: normOpts.debug.level,
      source: debugResolution.source,
    });
  }

  if (initLogger.isLevelEnabled('debug')) {
    initLogger.debug('Smartlinker plugin initialized', {
      folderCount: normOpts.folders.length,
      iconCount: Object.keys(normOpts.icons ?? {}).length,
    });
  }

  const resolvedFolders: ResolvedFolder[] = normOpts.folders.map((folder) => {
    const absPath = resolve(_context.siteDir, folder.path);
    return {
      ...folder,
      absPath,
      id: normalizeFolderId(_context.siteDir, absPath),
    } satisfies ResolvedFolder;
  });

  if (initLogger.isLevelEnabled('trace') && resolvedFolders.length > 0) {
    initLogger.trace('Resolved SmartLink folders', () => ({
      folders: resolvedFolders.map(
        (folder) => `${folder.id}:${formatSiteRelativePath(folder.absPath)}`
      ),
    }));
  }

  const folderById = new Map<string, ResolvedFolder>();
  for (const folder of resolvedFolders) {
    folderById.set(folder.id, folder);
  }

  if (warnings.length > 0 && optionsLogger.isLevelEnabled('warn')) {
    for (const warning of warnings) {
      optionsLogger.warn(warning.message, () => ({
        code: warning.code,
        ...(warning.details ?? {}),
      }));
    }
  }

  let primedFiles: RawDocFile[] | null = null;
  let cachedEntries: IndexRawEntry[] = [];
  let cachedEntrySignatures = new Map<string, string>();
  let cachedEntriesBySource = new Map<string, IndexRawEntry[]>();

  const toAbsolutePath = (filePath: string): string =>
    isAbsolute(filePath) ? filePath : resolve(_context.siteDir, filePath);

  const normalizeFsPath = (filePath: string): string => {
    if (!filePath) {
      return _context.siteDir.replace(/\\/g, '/');
    }
    const abs = toAbsolutePath(filePath);
    return abs.replace(/\\/g, '/');
  };

  const buildWatchPattern = (absPath: string): string => {
    const normalized = normalizeFsPath(absPath).replace(/\/+$/, '');
    return `${normalized}/**/*.{md,mdx}`;
  };

  const collectFiles = (): RawDocFile[] => {
    const start = startTimer(scanLogger, 'debug', 'info');
    const files: RawDocFile[] = [];
    for (const folder of resolvedFolders) {
      const scanned = scanMdFiles({ roots: [folder.absPath] });
      for (const file of scanned) {
        files.push({ ...file, folderId: folder.id });
      }
    }
    stats.scannedFileCount = files.length;

    if (scanLogger.isLevelEnabled('debug')) {
      scanLogger.debug('Scanned SmartLink folders', {
        folderCount: resolvedFolders.length,
        fileCount: files.length,
        durationMs: endTimer(start),
      });
    }

    if (scanLogger.isLevelEnabled('trace') && files.length > 0) {
      scanLogger.trace('Collected SmartLink files', () => ({
        files: files.map((file) => formatSiteRelativePath(file.path)),
      }));
    }

    return files;
  };

  const computeEntrySignature = (entry: IndexRawEntry): string =>
    JSON.stringify({
      slug: entry.slug,
      terms: [...entry.terms],
      icon: entry.icon ?? null,
      shortNote: entry.shortNote ?? null,
      folderId: entry.folderId ?? null,
      sourcePath: normalizeFsPath(entry.sourcePath ?? ''),
    });

  const refreshEntryCaches = (entries: IndexRawEntry[]) => {
    cachedEntries = entries.map((entry) => ({ ...entry }));
    const signatures = new Map<string, string>();
    const bySource = new Map<string, IndexRawEntry[]>();
    for (const entry of entries) {
      signatures.set(entry.id, computeEntrySignature(entry));
      const key = normalizeFsPath(entry.sourcePath ?? '');
      const list = bySource.get(key);
      if (list) {
        list.push(entry);
      } else {
        bySource.set(key, [entry]);
      }
    }
    cachedEntrySignatures = signatures;
    cachedEntriesBySource = bySource;
  };

  const isPathWithinFolder = (absPath: string): boolean => {
    for (const folder of resolvedFolders) {
      const relPath = relative(folder.absPath, absPath);
      if (!relPath || (!relPath.startsWith('..') && !isAbsolute(relPath))) {
        return true;
      }
    }
    return false;
  };

  const filterRelevantPaths = (paths: string[]): Set<string> => {
    const relevant = new Set<string>();
    for (const candidate of paths) {
      if (!candidate) continue;
      const absPath = normalizeFsPath(candidate);
      if (isPathWithinFolder(absPath)) {
        relevant.add(absPath);
      }
    }
    return relevant;
  };

  const diffEntryState = (
    nextEntries: IndexRawEntry[],
    impactedPaths: Set<string>,
  ): {
    impactedTermIds: Set<string>;
    addedTermIds: Set<string>;
    removedTermIds: Set<string>;
    changedTermIds: Set<string>;
  } => {
    const impactedTermIds = new Set<string>();
    const nextBySource = new Map<string, IndexRawEntry[]>();
    const nextSignatures = new Map<string, string>();

    for (const entry of nextEntries) {
      const sourceKey = normalizeFsPath(entry.sourcePath ?? '');
      const arr = nextBySource.get(sourceKey);
      if (arr) {
        arr.push(entry);
      } else {
        nextBySource.set(sourceKey, [entry]);
      }
      nextSignatures.set(entry.id, computeEntrySignature(entry));
    }

    for (const path of impactedPaths) {
      const prevEntries = cachedEntriesBySource.get(path);
      if (prevEntries) {
        for (const entry of prevEntries) {
          impactedTermIds.add(entry.id);
        }
      }
      const nextEntriesForPath = nextBySource.get(path);
      if (nextEntriesForPath) {
        for (const entry of nextEntriesForPath) {
          impactedTermIds.add(entry.id);
        }
      }
    }

    const addedTermIds = new Set<string>();
    const removedTermIds = new Set<string>();
    const changedTermIds = new Set<string>();

    for (const [id, signature] of nextSignatures) {
      const previous = cachedEntrySignatures.get(id);
      if (previous === undefined) {
        addedTermIds.add(id);
        changedTermIds.add(id);
      } else if (previous !== signature) {
        changedTermIds.add(id);
      }
    }

    for (const [id] of cachedEntrySignatures) {
      if (!nextSignatures.has(id)) {
        removedTermIds.add(id);
        changedTermIds.add(id);
      }
    }

    return { impactedTermIds, addedTermIds, removedTermIds, changedTermIds };
  };

  const applyFolderDefaults = (entries: IndexRawEntry[]) => {
    for (const entry of entries) {
      const folder = entry.folderId ? folderById.get(entry.folderId) : undefined;
      if (!folder) continue;
      if (!entry.icon && folder.defaultIcon && normOpts.icons[folder.defaultIcon]) {
        entry.icon = folder.defaultIcon;
      }
    }
  };

  const computeDocIdForEntry = (entry: IndexRawEntry): string | undefined => {
    const folder = entry.folderId ? folderById.get(entry.folderId) : undefined;
    if (!folder) return undefined;
    return deriveDocId(folder.absPath, entry.sourcePath);
  };

  const primeIndexProvider = () => {
    const start = startTimer(indexLogger, 'debug', 'info');
    primedFiles = collectFiles();
    const indexBuildStart = performance.now();
    const { entries } = loadIndexFromFiles(primedFiles);
    applyFolderDefaults(entries);
    setIndexEntries(entries);
    refreshEntryCaches(entries);
    stats.entryCount = entries.length;
    recordIndexBuildMs(performance.now() - indexBuildStart);

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
  };

  primeIndexProvider();

  const plugin: WatchCapablePlugin<Content> = {
    name: pluginName,

    getPathsToWatch() {
      const patterns = new Set<string>();
      for (const folder of resolvedFolders) {
        patterns.add(buildWatchPattern(folder.absPath));
      }
      return Array.from(patterns);
    },

    configureWebpack() {
      if (webpackLogger.isLevelEnabled('debug')) {
        webpackLogger.debug('configureWebpack invoked', {
          tooltipComponentCount: Object.keys(normOpts.tooltipComponents ?? {}).length,
        });
      }
      return {};
    },

    async loadContent() {
      const usingPrimed = primedFiles !== null;
      const start = startTimer(loadLogger, 'info', 'debug');
      const files = primedFiles ?? collectFiles();
      primedFiles = null;
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
          files: files.map((file) => formatSiteRelativePath(file.path)),
        }));
      }

      const compileMdx = await createTooltipMdxCompiler(_context);
      const indexBuildStart = performance.now();
      const { entries, notes, registry } = await buildArtifacts(files, {
        compileMdx,
      });
      recordIndexBuildMs(performance.now() - indexBuildStart);

      stats.entryCount = entries.length;
      stats.noteCount = notes.length;
      stats.registryBytes = Buffer.byteLength(registry.contents, 'utf8');

      applyFolderDefaults(entries);
      // Update in-memory index for remark consumers first
      setIndexEntries(entries);

      // Detect term changes compared to previous cache and proactively
      // trigger rebuild of docs that reference affected term IDs.
      // This covers dev watch scenarios where Docusaurus does not call a
      // dedicated onFilesChange hook.
      try {
        const { changedTermIds, addedTermIds, removedTermIds } = diffEntryState(
          entries,
          new Set<string>(),
        );
        if (changedTermIds.size > 0) {
          const docsForReload = new Set<string>(
            getDocsReferencingTerms(changedTermIds)
          );
          const touchedDocs: string[] = [];
          if (docsForReload.size > 0) {
            const now = new Date();
            for (const docPath of docsForReload) {
              const absDocPath = normalizeFsPath(docPath);
              if (!existsSync(absDocPath)) continue;
              try {
                utimesSync(absDocPath, now, now);
                touchedDocs.push(absDocPath);
              } catch (error) {
                if (watchLogger.isLevelEnabled('warn')) {
                  watchLogger.warn(
                    'Failed to mark SmartLink consumer for rebuild',
                    () => ({
                      file: formatSiteRelativePath(absDocPath),
                      error:
                        error instanceof Error ? error.message : String(error),
                    })
                  );
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
              rebuiltDocs: touchedDocs.map((p) => formatSiteRelativePath(p)),
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

      // Refresh caches after change detection so subsequent diffs compare
      // against the latest state.
      refreshEntryCaches(entries);

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

      return {
        entries,
        notes,
        registry,
        opts: normOpts,
      } satisfies Content;
    },

    async onFilesChange({ changedFiles, deletedFiles }: OnFilesChangeParams) {
      const candidates = [...(changedFiles ?? []), ...(deletedFiles ?? [])];
      const relevantPaths = filterRelevantPaths(candidates);

      if (relevantPaths.size === 0) {
        if (watchLogger.isLevelEnabled('trace')) {
          watchLogger.trace('No SmartLink folders affected by file change', () => ({
            changedFiles: changedFiles ?? [],
            deletedFiles: deletedFiles ?? [],
          }));
        }
        return;
      }

      const start = startTimer(watchLogger, 'info', 'debug');
      const files = collectFiles();
      primedFiles = files;
      stats.scannedFileCount = files.length;

      const indexBuildStart = performance.now();
      const { entries } = loadIndexFromFiles(files);
      applyFolderDefaults(entries);
      recordIndexBuildMs(performance.now() - indexBuildStart);

      const { impactedTermIds, addedTermIds, removedTermIds, changedTermIds } = diffEntryState(
        entries,
        relevantPaths,
      );

      setIndexEntries(entries);
      refreshEntryCaches(entries);
      stats.entryCount = entries.length;

      const docsForReload = new Set<string>(getDocsReferencingTerms(changedTermIds));
      const touchedDocs: string[] = [];
      if (docsForReload.size > 0) {
        const now = new Date();
        for (const docPath of docsForReload) {
          const absDocPath = normalizeFsPath(docPath);
          if (!existsSync(absDocPath)) continue;
          try {
            utimesSync(absDocPath, now, now);
            touchedDocs.push(absDocPath);
          } catch (error) {
            if (watchLogger.isLevelEnabled('warn')) {
              watchLogger.warn('Failed to mark SmartLink consumer for rebuild', () => ({
                file: formatSiteRelativePath(absDocPath),
                error: error instanceof Error ? error.message : String(error),
              }));
            }
          }
        }
      }

      if (watchLogger.isLevelEnabled('info')) {
        watchLogger.info('SmartLink watch rebuild complete', {
          scannedFileCount: files.length,
          changedTermCount: changedTermIds.size,
          addedTermCount: addedTermIds.size,
          removedTermCount: removedTermIds.size,
          rebuiltDocCount: touchedDocs.length,
          durationMs: endTimer(start),
        });
      }

      if (watchLogger.isLevelEnabled('debug')) {
        watchLogger.debug('SmartLink watch diff', () => ({
          triggeredBy: Array.from(relevantPaths).map((p) => formatSiteRelativePath(p)),
          impactedTermIds: Array.from(impactedTermIds),
          changedTermIds: Array.from(changedTermIds),
          addedTermIds: Array.from(addedTermIds),
          removedTermIds: Array.from(removedTermIds),
          rebuiltDocs: touchedDocs.map((p) => formatSiteRelativePath(p)),
        }));
      }
    },

    async contentLoaded({ content, actions }: { content: Content; actions: PluginContentLoadedActions }) {
      if (!content) return;
      const { notes, registry, entries, opts } = content;

      const start = startTimer(contentLogger, 'info', 'debug');

      if (contentLogger.isLevelEnabled('debug')) {
        contentLogger.debug('Writing SmartLink generated modules', {
          noteCount: notes.length,
          registryModule: registry.filename,
        });
      }

      for (const note of notes) {
        await actions.createData(note.filename, note.contents);
      }
      await actions.createData(registry.filename, registry.contents);

      const tooltipComponentsModule = emitTooltipComponentsModule(
        opts.tooltipComponents ?? {}
      );
      await actions.createData(
        tooltipComponentsModule.filename,
        tooltipComponentsModule.contents
      );

      const enrichedEntries = entries.map((entry) => ({
        ...entry,
        docId: entry.docId ?? computeDocIdForEntry(entry),
      }));

      const docsContent = loadDocsContentFromGenerated(_context.generatedFilesDir);
      const resolved = resolveEntryPermalinks({
        siteDir: _context.siteDir,
        entries: enrichedEntries,
        docsContent,
      });

      stats.resolvedCount = resolved.length;

      publishGlobalData(actions, opts, resolved);

      if (contentLogger.isLevelEnabled('info')) {
        contentLogger.info('Published SmartLink global data', {
          entryCount: resolved.length,
          durationMs: endTimer(start),
        });
      }

      if (contentLogger.isLevelEnabled('trace') && resolved.length > 0) {
        contentLogger.trace('Resolved SmartLink permalinks', () => ({
          permalinks: resolved.map((entry) => entry.permalink ?? null),
        }));
      }
    },

    async postBuild() {
      const termProcessingMs = consumeTermProcessingMs();
      const indexBuildMs = consumeIndexBuildMs();
      stats.termProcessingMs = termProcessingMs;
      stats.indexBuildMs = indexBuildMs;

      if (postBuildLogger.isLevelEnabled('info')) {
        postBuildLogger.info('SmartLink build complete', {
          entryCount: stats.resolvedCount,
          noteCount: stats.noteCount,
          filesScanned: stats.scannedFileCount,
          reusedPrimedFiles: stats.reusedPrimedFiles,
          registryBytes: stats.registryBytes,
          indexBuildMs: stats.indexBuildMs,
          termProcessingMs: stats.termProcessingMs,
        });
      }

      if (postBuildLogger.isLevelEnabled('debug')) {
        postBuildLogger.debug('Term processing duration', {
          termProcessingMs,
        });
        postBuildLogger.debug('Index build duration', {
          indexBuildMs,
        });
      }
    },

    getThemePath() {
      return join(moduleDir, 'theme', 'runtime');
    },

    getTypeScriptThemePath() {
      return join(moduleDir, 'theme');
    },

    getClientModules() {
      return [join(moduleDir, 'theme/styles.css')];
    },
  };
  return plugin;
}

function deriveDocId(folderAbsPath: string, sourcePath: string | undefined): string | undefined {
  if (!sourcePath) return undefined;
  const rel = relative(folderAbsPath, sourcePath);
  if (!rel || rel.startsWith('..')) return undefined;
  const normalized = rel.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.[^./]+$/u, '');
  return withoutExt || undefined;
}

function loadDocsContentFromGenerated(
  generatedFilesDir: string,
): Record<string, DocsLoadedContent | undefined> {
  const root = join(generatedFilesDir, 'docusaurus-plugin-content-docs');
  const result: Record<string, DocsLoadedContent> = {};

  let pluginIds: string[] = [];
  try {
    pluginIds = readdirSync(root);
  } catch {
    return result;
  }

  for (const pluginId of pluginIds) {
    const pluginDir = join(root, pluginId);
    let stats;
    try {
      stats = statSync(pluginDir);
    } catch {
      continue;
    }
    if (!stats.isDirectory()) continue;

    const docs: any[] = [];
    for (const file of readdirSync(pluginDir)) {
      if (!file.endsWith('.json')) continue;
      if (file.startsWith('__')) continue;
      const abs = join(pluginDir, file);
      try {
        const parsed = JSON.parse(readFileSync(abs, 'utf8'));
        if (parsed && typeof parsed === 'object' && typeof parsed.permalink === 'string') {
          docs.push(parsed);
        }
      } catch {
        continue;
      }
    }

    result[pluginId] = {
      loadedVersions: [
        {
          docs,
        } as any,
      ],
    } as DocsLoadedContent;
  }

  return result;
}
