// Note: dynamic import to avoid resolving ESM-only deps at plugin load time
/**
 * Sanitize an id into a safe filename segment.
 */
function safeId(id) {
    return id.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
}
export async function emitShortNoteModule(id, shortNote, compileMdx) {
    const sn = (shortNote ?? '').trim();
    if (!sn)
        return null;
    try {
        const compile = compileMdx ?? (await import('@mdx-js/mdx')).compile;
        // Compile MDX into ESM (string); MDX v3 defaults to the automatic runtime.
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
    }
    catch {
        // If MDX compilation fails (e.g., due to ESM loader issues), fall back to ReactMarkdown
        const text = JSON.stringify(sn);
        const mod = `
/* AUTO-GENERATED: fallback markdown note */
import * as React from 'react';
import ReactMarkdown from 'react-markdown';

export function ShortNote(props) {
  const { components, ...rest } = props ?? {};
  return React.createElement(
    ReactMarkdown,
    components ? { components, ...rest } : rest,
    ${text}
  );
}
`.trimStart();
        const filename = `notes/${safeId(id)}.js`;
        return { filename, contents: mod };
    }
}
//# sourceMappingURL=notesEmitter.js.map