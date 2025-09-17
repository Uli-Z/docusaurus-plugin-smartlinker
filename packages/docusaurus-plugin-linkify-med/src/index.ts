import { readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from '@docusaurus/types';
import type { LoadContext, PluginContentLoadedActions } from '@docusaurus/types';
import { validateOptions, type PluginOptions, type NormalizedOptions } from './options.js';
import { scanMdFileStats } from './node/fsScan.js';
import { parseFrontmatterFile } from './frontmatter.js';
import type { IndexRawEntry } from './types.js';
import {
  emitShortNoteModule,
  type NoteModule,
  type CompileMdx,
} from './codegen/notesEmitter.js';
import { emitRegistry, type RegistryModule } from './codegen/registryEmitter.js';
import { emitTooltipComponentsModule } from './codegen/tooltipComponentsEmitter.js';
import { PLUGIN_NAME } from './pluginName.js';
import { createTooltipMdxCompiler } from './node/tooltipMdxCompiler.js';

export type {
  FsIndexProviderOptions,
  IndexProvider,
  TargetInfo,
} from './fsIndexProvider.js';
export { createFsIndexProvider } from './fsIndexProvider.js';
export { PLUGIN_NAME } from './pluginName.js';

export type { PluginOptions } from './options.js';

type Content = {
  entries: IndexRawEntry[];
  notes: NoteModule[];
  registry: RegistryModule;
  opts: NormalizedOptions;
};

const moduleDir = dirname(fileURLToPath(import.meta.url));
const pluginName = PLUGIN_NAME;

const WATCH_EXTENSIONS = ['md', 'mdx'] as const;

type CachedFrontmatter = {
  mtimeMs: number;
  entry?: IndexRawEntry;
  noteModule?: NoteModule | null;
};

function toPosixGlobPath(value: string): string {
  return value.split(sep).join('/');
}

export default function linkifyMedPlugin(
  _context: LoadContext,
  optsIn?: PluginOptions
): Plugin<Content> {
  const { options: normOpts } = validateOptions(optsIn);
  const cache = new Map<string, CachedFrontmatter>();
  const roots = [_context.siteDir];

  let compileMdxCache: CompileMdx | undefined;
  let compileMdxPromise: Promise<CompileMdx> | null = null;

  async function ensureCompileMdx(): Promise<CompileMdx> {
    if (compileMdxCache) return compileMdxCache;
    if (!compileMdxPromise) {
      compileMdxPromise = createTooltipMdxCompiler(_context);
    }
    compileMdxCache = await compileMdxPromise;
    return compileMdxCache;
  }

  return {
    name: pluginName,

    getPathsToWatch() {
      const seen = new Set<string>();
      const globs: string[] = [];

      for (const root of roots) {
        for (const ext of WATCH_EXTENSIONS) {
          const glob = toPosixGlobPath(join(root, '**', `*.${ext}`));
          if (!seen.has(glob)) {
            seen.add(glob);
            globs.push(glob);
          }
        }
      }

      return globs;
    },

    async loadContent() {
      const stats = scanMdFileStats({ roots });
      const statsMap = new Map(stats.map(item => [item.path, item]));

      for (const existing of Array.from(cache.keys())) {
        if (!statsMap.has(existing)) {
          cache.delete(existing);
        }
      }

      for (const stat of stats) {
        const previous = cache.get(stat.path);
        if (previous && previous.mtimeMs === stat.mtimeMs) {
          continue;
        }

        let entry: IndexRawEntry | undefined;
        try {
          const content = readFileSync(stat.path, 'utf8');
          ({ entry } = parseFrontmatterFile({
            path: stat.path,
            content,
            ext: stat.ext,
          }));
        } catch {
          cache.delete(stat.path);
          continue;
        }

        let noteModule: NoteModule | null = null;
        if (entry?.shortNote) {
          if (
            previous?.entry &&
            previous.entry.id === entry.id &&
            previous.entry.shortNote === entry.shortNote &&
            previous.noteModule
          ) {
            noteModule = previous.noteModule;
          } else {
            const compiler = await ensureCompileMdx();
            noteModule = (await emitShortNoteModule(entry.id, entry.shortNote, compiler)) ?? null;
          }
        }

        cache.set(stat.path, {
          mtimeMs: stat.mtimeMs,
          entry,
          noteModule,
        });
      }

      const entries = Array.from(cache.values())
        .map(item => item.entry)
        .filter((e): e is IndexRawEntry => Boolean(e))
        .sort((a, b) => a.id.localeCompare(b.id));

      const notes = Array.from(cache.values())
        .map(item => item.noteModule)
        .filter((mod): mod is NoteModule => Boolean(mod))
        .sort((a, b) => a.filename.localeCompare(b.filename));

      const registry = emitRegistry(entries, notes);

      return {
        entries,
        notes,
        registry,
        opts: normOpts,
      } satisfies Content;
    },

    async contentLoaded({ content, actions }: { content: Content; actions: PluginContentLoadedActions }) {
      if (!content) return;
      const { notes, registry, entries, opts } = content;

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

      const registryMeta = entries.map(({ id, slug, icon }) => ({ id, slug, icon }));
      actions.setGlobalData({ options: opts, entries: registryMeta });
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
}
