import type { IndexRawEntry } from '../types';
import type { NoteModule } from './notesEmitter';

export interface TooltipEntry {
  id: string;
  slug: string;
  icon?: string;
  ShortNote?: React.FC<{ components?: Record<string, any> }>;
}

export interface RegistryModule {
  filename: string;
  contents: string;
}

/**
 * Emit a registry TSX module that imports all ShortNote components
 * and exposes them in a map keyed by entry.id.
 */
export function emitRegistry(
  entries: IndexRawEntry[],
  noteModules: NoteModule[]
): RegistryModule {
  const imports: string[] = [];
  const records: string[] = [];

  // Create quick lookup from filename base → NoteModule
  const noteById = new Map<string, NoteModule>();
  for (const m of noteModules) {
    const base = m.filename.replace(/^notes\//, '').replace(/\.tsx$/, '');
    noteById.set(base, m);
  }

  // Sort entries by id for deterministic output
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));

  for (const e of sorted) {
    const safeId = e.id.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
    const note = noteById.get(safeId);

    let shortNoteField = '';
    if (note) {
      const importName = `ShortNote_${safeId.replace(/-/g, '_')}`;
      imports.push(`import { ShortNote as ${importName} } from './${note.filename}';`);
      shortNoteField = `ShortNote: ${importName},`;
    }

    records.push(`  "${e.id}": {
    id: "${e.id}",
    slug: "${e.slug}",
    ${e.icon ? `icon: "${e.icon}",` : ''}
    ${shortNoteField}
  }`);
  }

  const mod = `
/* AUTO-GENERATED REGISTRY */
import * as React from 'react';
${imports.join('\n')}

export interface TooltipEntry {
  id: string;
  slug: string;
  icon?: string;
  ShortNote?: React.FC<{ components?: Record<string, any> }>;
}

export const registry: Record<string, TooltipEntry> = {
${records.join(',\n')}
};
`.trimStart();

  return { filename: 'registry.tsx', contents: mod };
}

