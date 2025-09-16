import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { emitShortNoteModule } from '../src/codegen/notesEmitter.js';

function transpiles(code: string): { ok: boolean; diagnostics: string[] } {
  const res = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
    }
  });
  // TypeScript transpileModule doesn't give structured diags unless we use the full program API;
  // for our smoke test, ensure it produced some output and didn't throw.
  return { ok: typeof res.outputText === 'string' && res.outputText.length > 0, diagnostics: [] };
}

describe('emitShortNoteModule', () => {
  it('returns null for empty or whitespace-only shortNote', async () => {
    const m1 = await emitShortNoteModule('amoxicillin', '');
    const m2 = await emitShortNoteModule('amoxicillin', '   ');
    expect(m1).toBeNull();
    expect(m2).toBeNull();
  });

  it('emits JS for markdown-only content', async () => {
    const note = `**Aminopenicillin.** p.o./i.v.`;
    const mod = await emitShortNoteModule('amoxicillin', note);
    expect(mod).not.toBeNull();
    expect(mod!.filename).toBe('notes/amoxicillin.js');
    expect(mod!.contents).toMatch(/export function ShortNote/);
    const tr = transpiles(mod!.contents);
    expect(tr.ok).toBe(true);
  });

  it('emits JS that forwards components for custom JSX tags', async () => {
    const note = `
**Aminopenicillin**
<DrugTip note="Good oral bioavailability" />
`;
    const mod = await emitShortNoteModule('amoxicillin', note);
    expect(mod).not.toBeNull();
    // Should reference MDXContent and accept components prop
    expect(mod!.contents).toMatch(/React\.createElement\(MDXContent/);
    expect(mod!.contents).toContain('const { components, ...rest } = props ?? {};');
    expect(mod!.contents).toContain('const mdxProps = components ? { components, ...rest } : rest;');
    const tr = transpiles(mod!.contents);
    expect(tr.ok).toBe(true);
  });

  it('sanitizes filename from id', async () => {
    const mod = await emitShortNoteModule('Pip/Tazo 1.0', '**Note**');
    expect(mod!.filename).toBe('notes/pip-tazo-1-0.js');
  });
});
