import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from '@docusaurus/types';
import type { LoadContext, PluginContentLoadedActions } from '@docusaurus/types';
import { validateOptions, type PluginOptions, type NormalizedOptions } from './options';
import { scanMdFiles } from './node/fsScan';
import { buildArtifacts } from './node/buildPipeline';

export type {
  FsIndexProviderOptions,
  IndexProvider,
  TargetInfo,
} from './fsIndexProvider';
export { createFsIndexProvider } from './fsIndexProvider';

export type { PluginOptions } from './options';

type Content = {
  noteFiles: string[];
  registryFile: string;
  opts: NormalizedOptions;
};

const moduleDirname = dirname(fileURLToPath(import.meta.url));
const themePath = join(moduleDirname, '../src/theme');
const tsThemePath = themePath;

export default function linkifyMedPlugin(_context: LoadContext, optsIn?: PluginOptions): Plugin<Content> {
  const { options: normOpts } = validateOptions(optsIn);

  return {
    name: 'docusaurus-plugin-linkify-med',

    async loadContent() {
      const roots = [_context.siteDir];
      const files = scanMdFiles({ roots });
      const { notes, registry } = await buildArtifacts(files);

      return {
        noteFiles: notes.map(n => n.filename),
        registryFile: registry.filename,
        opts: normOpts,
      } as Content;
    },

    async contentLoaded({ content, actions }: { content: Content; actions: PluginContentLoadedActions }) {
      if (!content) return;
      const roots = [_context.siteDir];
      const files = scanMdFiles({ roots });
      const { notes, registry } = await buildArtifacts(files);

      for (const note of notes) {
        await actions.createData(note.filename, note.contents);
      }
      await actions.createData(registry.filename, registry.contents);

      actions.setGlobalData({ options: content.opts });
    },

    getThemePath() {
      return themePath;
    },

    getTypeScriptThemePath() {
      return tsThemePath;
    },

    getClientModules() {
      return [];
    },
  };
}
