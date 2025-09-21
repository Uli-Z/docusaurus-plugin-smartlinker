/**
 * Result of emitting an ESM module for a given shortNote.
 */
export interface NoteModule {
    filename: string;
    contents: string;
}
/**
 * Compile a shortNote (MDX string) into an ESM module that exports:
 *   export function ShortNote(props)
 *
 * The compiled MDXContent will receive props.components as its MDX components map,
 * so that custom tags (e.g., <DrugTip/>) can be provided by the caller at render time.
 *
 * @param id stable page id (used to generate filename)
 * @param shortNote raw MDX string (already trimmed by the frontmatter parser)
 * @returns NoteModule or null if shortNote is empty/undefined
 */
export type CompileMdx = (value: string, options?: Record<string, unknown>) => Promise<{
    value: unknown;
}>;
export declare function emitShortNoteModule(id: string, shortNote?: string, compileMdx?: CompileMdx): Promise<NoteModule | null>;
//# sourceMappingURL=notesEmitter.d.ts.map