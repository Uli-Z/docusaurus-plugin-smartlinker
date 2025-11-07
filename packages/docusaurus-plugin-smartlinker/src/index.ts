import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
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
import { recordIndexBuildMs, resetMetrics, consumeIndexBuildMs, consumeTermProcessingMs } from './metricsStore.js';
import { getDocsReferencingTerms } from './termUsageStore.js';
import { normalizeFolderId, formatSiteRelativePath, normalizeFsPath } from './plugin/paths.js';
import { EntryStateCache } from './plugin/state.js';
import { getPathsToWatch as getWatchPaths, filterRelevantPaths, createOnFilesChangeHandler } from './plugin/watch.js';
import { publishGlobalData, loadDocsContentFromGenerated, resolveAndPublish, writeGeneratedModules } from './plugin/publish.js';
import { startTimer, endTimer } from './plugin/timing.js';
import { createCollectFiles } from './plugin/files.js';
import { createApplyFolderDefaults, createComputeDocIdForEntry } from './plugin/entries.js';
import { createPrimeIndexProvider } from './plugin/prime.js';
import { createLoadContent } from './plugin/loadContent.js';
import { handlePostBuild } from './plugin/postBuild.js';

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
  changedTermCount: number;
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

const moduleDir = dirname(fileURLToPath(import.meta.url));
const pluginName = PLUGIN_NAME;

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
  const permalinkLogger = logger.child('permalink');

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

  // Timing helpers imported from plugin/timing

  const toSiteRel = (absPath: string): string =>
    formatSiteRelativePath(_context.siteDir, absPath);

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
        (folder) => `${folder.id}:${toSiteRel(folder.absPath)}`
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

  const normalizePath = (p: string): string => normalizeFsPath(_context.siteDir, p);

  const collectFiles = createCollectFiles(
    resolvedFolders,
    scanLogger,
    startTimer as any,
    endTimer as any,
    toSiteRel,
    (n) => {
      stats.scannedFileCount = n;
    },
  );

  const entryState = new EntryStateCache(_context.siteDir);

  const applyFolderDefaults = createApplyFolderDefaults(folderById, normOpts.icons);
  const computeDocIdForEntry = createComputeDocIdForEntry(folderById);

  const primeIndexProvider = createPrimeIndexProvider({
    indexLogger,
    collectFiles,
    loadIndexFromFiles,
    applyFolderDefaults,
    setIndexEntries,
    entryState,
    stats,
    recordIndexBuildMs,
    startTimer: startTimer as any,
    endTimer: endTimer as any,
  });

  primedFiles = primeIndexProvider();

  const onFilesChangeImpl = createOnFilesChangeHandler({
    siteDir: _context.siteDir,
    resolvedFolders,
    watchLogger,
    collectFiles,
    loadIndexFromFiles,
    applyFolderDefaults,
    recordIndexBuildMs,
    setIndexEntries,
    entryState,
    getDocsReferencingTerms,
    toSiteRel,
    normalizePath,
    startTimer: startTimer as any,
    endTimer: endTimer as any,
    stats,
  });

  const loadContentImpl = createLoadContent({
    context: _context,
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
    toSiteRel,
    stats,
    startTimer: startTimer as any,
    endTimer: endTimer as any,
    primedRef: { current: primedFiles },
  });

  const plugin: WatchCapablePlugin<Content> = {
    name: pluginName,

    getPathsToWatch() {
      return getWatchPaths(_context.siteDir, resolvedFolders);
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
      // bridge primedFiles reference into the helper
      const result = await createLoadContent({
        context: _context,
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
        toSiteRel,
        stats,
        startTimer: startTimer as any,
        endTimer: endTimer as any,
        primedRef: { current: primedFiles },
      })();
      // helper consumes primedRef; reset local copy
      primedFiles = null;
      return result as Content;
    },

    async onFilesChange(params: OnFilesChangeParams) {
      // Prime files for the next loadContent call to reuse
      // Reuse local collectFiles so priming behavior remains
      const candidates = [...(params.changedFiles ?? []), ...(params.deletedFiles ?? [])];
      const relevantPaths = filterRelevantPaths(_context.siteDir, candidates, resolvedFolders);
      if (relevantPaths.size === 0) {
        if (watchLogger.isLevelEnabled('trace')) {
          watchLogger.trace('No SmartLink folders affected by file change', () => ({
            changedFiles: params.changedFiles ?? [],
            deletedFiles: params.deletedFiles ?? [],
          }));
        }
        return;
      }
      // Run the shared handler
      await onFilesChangeImpl(params);
      // Keep the priming behavior for the next build step
      primedFiles = collectFiles();
    },

    async contentLoaded({ content, actions }: { content: Content; actions: PluginContentLoadedActions }) {
      if (!content) return;
      const { notes, registry, entries, opts, changedTermCount } = content;

      const start = startTimer(contentLogger, 'info', 'debug');

      const tooltipComponentsModule = emitTooltipComponentsModule(opts.tooltipComponents ?? {});
      await writeGeneratedModules({
        actions,
        notes,
        registry,
        tooltipComponentsModule,
        contentLogger,
      });

      // Write a small changing marker when terms change to invalidate
      // downstream consumers without touching source MDX files.
      if (changedTermCount > 0) {
        const markerName = 'smartlinker/marker.json';
        const marker = JSON.stringify({ ts: Date.now(), changedTermCount }, null, 2);
        await actions.createData(markerName, marker);
      }

      await resolveAndPublish({
        context: { siteDir: _context.siteDir, generatedFilesDir: _context.generatedFilesDir },
        actions,
        opts,
        entries,
        computeDocIdForEntry,
        stats,
        contentLogger,
        endTimer,
        startTime: start,
        permalinkLogger,
      });
    },

    async postBuild() {
      handlePostBuild({
        postBuildLogger,
        stats,
        consumeTermProcessingMs,
        consumeIndexBuildMs,
      });
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

// deriveDocId moved to ./plugin/entries

// loadDocsContentFromGenerated moved to ./plugin/publish
