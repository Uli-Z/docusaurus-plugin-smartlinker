import type { Plugin } from '@docusaurus/types';
import type { LoadContext } from '@docusaurus/types';
import { type PluginOptions, type NormalizedOptions } from './options.js';
import type { IndexRawEntry } from './types.js';
import type { NoteModule } from './codegen/notesEmitter.js';
import type { RegistryModule } from './codegen/registryEmitter.js';
export type { FsIndexProviderOptions, IndexProvider, TargetInfo, } from './fsIndexProvider.js';
export { createFsIndexProvider } from './fsIndexProvider.js';
export { PLUGIN_NAME } from './pluginName.js';
export { getIndexProvider } from './indexProviderStore.js';
export { resolveDebugConfig, createLogger, type LogLevel } from './logger.js';
export type { DebugOptions } from './options.js';
export { getDebugConfig, setDebugConfig } from './debugStore.js';
export { recordIndexBuildMs, resetMetrics, resetTermProcessingMs, recordTermProcessingMs, resetIndexBuildMs, consumeIndexBuildMs, consumeTermProcessingMs, getIndexBuildMs, getTermProcessingMs, } from './metricsStore.js';
export type { PluginOptions } from './options.js';
type Content = {
    entries: IndexRawEntry[];
    notes: NoteModule[];
    registry: RegistryModule;
    opts: NormalizedOptions;
};
export default function smartlinkerPlugin(_context: LoadContext, optsIn?: PluginOptions): Plugin<Content>;
//# sourceMappingURL=index.d.ts.map