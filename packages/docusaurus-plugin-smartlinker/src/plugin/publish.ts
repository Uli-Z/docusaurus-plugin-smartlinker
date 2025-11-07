import { join } from 'node:path';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import type { PluginContentLoadedActions } from '@docusaurus/types';
import type { NormalizedOptions } from '../options.js';
import type { EntryWithResolvedUrl } from '../node/permalinkResolver.js';
import { resolveEntryPermalinks, resolveEntryPermalinksUsingProvider, createContentLookupProvider } from '../node/permalinkResolver.js';
import type { LoadedContent as DocsLoadedContent } from '@docusaurus/plugin-content-docs';
import type { ContextLogger } from '../logger.js';

export function publishGlobalData(
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

export function loadDocsContentFromGenerated(
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

export async function resolveAndPublish(args: {
  context: { siteDir: string; generatedFilesDir: string };
  actions: PluginContentLoadedActions;
  opts: NormalizedOptions;
  entries: import('../types.js').IndexRawEntry[];
  computeDocIdForEntry: (entry: any) => string | undefined;
  stats: { resolvedCount: number };
  contentLogger: { isLevelEnabled(level: string): boolean; info: Function; trace: Function };
  endTimer: (start: number | null) => number | undefined;
  startTime: number | null;
  permalinkLogger?: ContextLogger;
}) {
  const { context, actions, opts, entries, computeDocIdForEntry, stats, contentLogger, endTimer, startTime, permalinkLogger } = args;
  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    docId: entry.docId ?? computeDocIdForEntry(entry),
  }));

  const docsContent = loadDocsContentFromGenerated(context.generatedFilesDir);
  const provider = createContentLookupProvider(docsContent);
  const resolved = resolveEntryPermalinksUsingProvider({
    siteDir: context.siteDir,
    entries: enrichedEntries,
    provider,
    permalinkLogger,
  });

  stats.resolvedCount = resolved.length;
  publishGlobalData(actions, opts, resolved);

  if (contentLogger.isLevelEnabled('info')) {
    contentLogger.info('Published SmartLink global data', {
      entryCount: resolved.length,
      durationMs: endTimer(startTime),
    });
  }

  if (contentLogger.isLevelEnabled('trace') && resolved.length > 0) {
    contentLogger.trace('Resolved SmartLink permalinks', () => ({
      permalinks: resolved.map((entry) => entry.permalink ?? null),
    }));
  }
}

export async function writeGeneratedModules(args: {
  actions: PluginContentLoadedActions;
  notes: import('../codegen/notesEmitter.js').NoteModule[];
  registry: import('../codegen/registryEmitter.js').RegistryModule;
  tooltipComponentsModule: { filename: string; contents: string };
  contentLogger: { isLevelEnabled(level: string): boolean; debug: Function };
}) {
  const { actions, notes, registry, tooltipComponentsModule, contentLogger } = args;
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
  await actions.createData(tooltipComponentsModule.filename, tooltipComponentsModule.contents);
}
