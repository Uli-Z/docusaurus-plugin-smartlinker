import type { RawDocFile, IndexRawEntry } from '../types.js';
import { type NoteModule, type CompileMdx } from '../codegen/notesEmitter.js';
import { type RegistryModule } from '../codegen/registryEmitter.js';
/**
 * Pure build pipeline used by the plugin:
 * - parse frontmatter
 * - compile notes (async)
 * - emit registry
 */
export interface BuildArtifacts {
    entries: IndexRawEntry[];
    notes: NoteModule[];
    registry: RegistryModule;
}
export interface BuildArtifactsOptions {
    compileMdx?: CompileMdx;
}
export declare function buildArtifacts(files: RawDocFile[], options?: BuildArtifactsOptions): Promise<BuildArtifacts>;
//# sourceMappingURL=buildPipeline.d.ts.map