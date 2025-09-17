import type { RawDocFile, IndexRawEntry } from '../types.js';
import { parseFrontmatter } from '../frontmatter.js';
import {
  emitShortNoteModule,
  type NoteModule,
  type CompileMdx,
} from '../codegen/notesEmitter.js';
import { emitRegistry, type RegistryModule } from '../codegen/registryEmitter.js';

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

export async function buildArtifacts(
  files: RawDocFile[],
  options?: BuildArtifactsOptions
): Promise<BuildArtifacts> {
  const { entries } = parseFrontmatter(files);

  // Compile notes for entries with shortNote
  const notes: NoteModule[] = [];
  const compile = options?.compileMdx;
  for (const e of entries) {
    if (e.shortNote) {
      const mod = await emitShortNoteModule(e.id, e.shortNote, compile);
      if (mod) notes.push(mod);
    }
  }

  // Emit registry (imports will refer to the emitted `notes/<id>.js`)
  const registry = emitRegistry(entries, notes);

  return { entries, notes, registry };
}

