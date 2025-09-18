import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from '@docusaurus/types';
import type { LoadContext, PluginContentLoadedActions } from '@docusaurus/types';
import { validateOptions, type PluginOptions, type NormalizedOptions } from './options.js';
import { scanMdFiles } from './node/fsScan.js';
import { buildArtifacts } from './node/buildPipeline.js';
import type { IndexRawEntry } from './types.js';
import type { NoteModule } from './codegen/notesEmitter.js';
import type { RegistryModule } from './codegen/registryEmitter.js';
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

export {
  default as remarkSmartlinker,
} from './remark/index.js';
export type {
  TargetInfo as RemarkTargetInfo,
  IndexProvider as RemarkIndexProvider,
  RemarkLinkifyMedOptions as RemarkPluginOptions,
} from './remark/transform.js';
export {
  buildMatcher as buildRemarkMatcher,
} from './remark/matcher.js';
export type {
  AutoLinkEntry as RemarkAutoLinkEntry,
  Match as RemarkMatch,
} from './remark/matcher.js';

export type { PluginOptions } from './options.js';

type Content = {
  entries: IndexRawEntry[];
  notes: NoteModule[];
  registry: RegistryModule;
  opts: NormalizedOptions;
};

const moduleDir = dirname(fileURLToPath(import.meta.url));
const pluginName = PLUGIN_NAME;

export default function smartlinkerPlugin(
  _context: LoadContext,
  optsIn?: PluginOptions
): Plugin<Content> {
  const { options: normOpts } = validateOptions(optsIn);

  return {
    name: pluginName,

    async loadContent() {
      const roots = [_context.siteDir];
      const files = scanMdFiles({ roots });
      const compileMdx = await createTooltipMdxCompiler(_context);
      const { entries, notes, registry } = await buildArtifacts(files, {
        compileMdx,
      });

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
