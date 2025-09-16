// Note: dynamic import to avoid resolving ESM-only deps at plugin load time

/**
 * Result of emitting an ESM module for a given shortNote.
 */
export interface NoteModule {
  filename: string;   // e.g., "notes/amoxicillin.js"
  contents: string;   // ESM source string
}

/**
 * Sanitize an id into a safe filename segment.
 */
function safeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
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
export async function emitShortNoteModule(
  id: string,
  shortNote?: string
): Promise<NoteModule | null> {
  const sn = (shortNote ?? '').trim();
  if (!sn) return null;

  try {
    // Compile MDX into ESM (string); MDX v3 defaults to the automatic runtime.
    const { compile } = await import('@mdx-js/mdx');
    const compiled = await compile(sn, {
      // Important: keep ESM output (string), we will wrap it into our TSX module.
      // We do not inject provider import source here; we pass components via props.
      development: false,
      // Ensure we output a full "program" so we can wrap/re-export cleanly.
      outputFormat: 'program',
    });

    // compiled.value is a string of ESM JS, typically exporting `MDXContent`.
    const esm = String(compiled.value);

    // Wrap into a TSX module that re-exports a stable API.
    // We forward `components` through to MDXContent so <DrugTip/> etc. resolve.
    const mod = `
/* AUTO-GENERATED: do not edit by hand */
import * as React from 'react';

// The MDX compiler output:
${esm}

// Stable wrapper API expected by the theme:
export function ShortNote(props) {
  const { components, ...rest } = props ?? {};
  const mdxProps = components ? { components, ...rest } : rest;
  // MDXContent is the default export from the compiled MDX above
  return React.createElement(MDXContent, mdxProps);
}
`.trimStart();

    const filename = `notes/${safeId(id)}.js`;
    return { filename, contents: mod };
  } catch {
    // If MDX compilation fails (e.g., due to ESM loader issues), fall back to plain text
    const text = JSON.stringify(sn);
    const mod = `
/* AUTO-GENERATED: fallback plain-text note */
import * as React from 'react';

export function ShortNote() {
  return React.createElement(React.Fragment, null, ${text});
}
`.trimStart();
    const filename = `notes/${safeId(id)}.js`;
    return { filename, contents: mod };
  }
}
