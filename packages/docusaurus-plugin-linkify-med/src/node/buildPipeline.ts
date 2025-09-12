import type { RawDocFile, IndexRawEntry } from '../types';
import { parseFrontmatter } from '../frontmatter';
import { emitShortNoteModule, type NoteModule } from '../codegen/notesEmitter';
import { emitRegistry, type RegistryModule } from '../codegen/registryEmitter';

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

export async function buildArtifacts(files: RawDocFile[]): Promise<BuildArtifacts> {
  const { entries } = parseFrontmatter(files);

  // Compile notes for entries with shortNote
  const notes: NoteModule[] = [];
  for (const e of entries) {
    if (e.shortNote) {
      const mod = await emitShortNoteModule(e.id, e.shortNote);
      if (mod) notes.push(mod);
    }
  }

  // Emit registry (imports will refer to the emitted `notes/<id>.tsx`)
  const registry = emitRegistry(entries, notes);

  return { entries, notes, registry };
}

