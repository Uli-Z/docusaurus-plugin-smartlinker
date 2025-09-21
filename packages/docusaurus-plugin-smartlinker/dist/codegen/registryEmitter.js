/**
 * Emit a registry TSX module that imports all ShortNote components
 * and exposes them in a map keyed by entry.id.
 */
export function emitRegistry(entries, noteModules) {
    const imports = [];
    const records = [];
    // Create quick lookup from filename base → NoteModule
    const noteById = new Map();
    for (const m of noteModules) {
        const base = m.filename.replace(/^notes\//, '').replace(/\.js$/, '');
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
        const iconField = e.icon ? `    icon: "${e.icon}",\n` : '';
        const permalinkField = `    permalink: "${e.slug}",\n`;
        const shortField = shortNoteField ? `    ${shortNoteField}\n` : '';
        records.push(`  "${e.id}": {
    id: "${e.id}",
    slug: "${e.slug}",
${permalinkField}${iconField}${shortField}  }`);
    }
    const mod = `
/* AUTO-GENERATED REGISTRY */
import * as React from 'react';
${imports.join('\n')}

export const registry = {
${records.join(',\n')}
};
`.trimStart();
    return { filename: 'registry.js', contents: mod };
}
//# sourceMappingURL=registryEmitter.js.map