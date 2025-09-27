import { parseFrontmatter } from '../frontmatter.js';
import { emitShortNoteModule, } from '../codegen/notesEmitter.js';
import { emitRegistry } from '../codegen/registryEmitter.js';
export async function buildArtifacts(files, options) {
    const { entries } = parseFrontmatter(files);
    // Compile notes for entries with shortNote
    const notes = [];
    const compile = options?.compileMdx;
    for (const e of entries) {
        if (e.shortNote) {
            const mod = await emitShortNoteModule(e.id, e.shortNote, compile);
            if (mod)
                notes.push(mod);
        }
    }
    // Emit registry (imports will refer to the emitted `notes/<id>.js`)
    const registry = emitRegistry(entries, notes);
    return { entries, notes, registry };
}
//# sourceMappingURL=buildPipeline.js.map