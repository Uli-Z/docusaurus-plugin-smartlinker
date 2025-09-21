import type { IndexRawEntry } from '../types.js';
import type { NoteModule } from './notesEmitter.js';
export interface TooltipEntry {
    id: string;
    slug: string;
    icon?: string;
    ShortNote?: React.FC<{
        components?: Record<string, any>;
    }>;
}
export interface RegistryModule {
    filename: string;
    contents: string;
}
/**
 * Emit a registry TSX module that imports all ShortNote components
 * and exposes them in a map keyed by entry.id.
 */
export declare function emitRegistry(entries: IndexRawEntry[], noteModules: NoteModule[]): RegistryModule;
//# sourceMappingURL=registryEmitter.d.ts.map