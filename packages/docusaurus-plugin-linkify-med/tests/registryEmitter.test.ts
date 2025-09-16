
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { emitRegistry } from '../src/codegen/registryEmitter.js';
import type { IndexRawEntry } from '../src/types.js';
import type { NoteModule } from '../src/codegen/notesEmitter.js';

function transpiles(code: string): boolean {
  const res = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      moduleResolution: ts.ModuleResolutionKind.Bundler
    }
  });
  return typeof res.outputText === 'string' && res.outputText.length > 0;
}

describe('emitRegistry', () => {
  const entries: IndexRawEntry[] = [
    { id: 'amoxicillin', slug: '/antibiotics/amoxicillin', synonyms: ['amoxi'], linkify: true, sourcePath: '/a.mdx', icon: 'pill', shortNote: '**Note**' },
    { id: 'vancomycin', slug: '/antibiotics/vancomycin', synonyms: ['vanco'], linkify: true, sourcePath: '/b.mdx' }
  ];

  const noteModules: NoteModule[] = [
    { filename: 'notes/amoxicillin.js', contents: '// dummy' }
  ];

  it('emits imports and registry entries with ShortNote when available', () => {
    const { filename, contents } = emitRegistry(entries, noteModules);
    expect(filename).toBe('registry.js');
    expect(contents).toMatch(/import { ShortNote as ShortNote_amoxicillin }/);
    expect(contents).toContain("'./notes/amoxicillin.js'");
    expect(contents).toMatch(/"amoxicillin": \{[^}]*ShortNote:/s);
    expect(contents).toMatch(/"vancomycin": \{/);
    expect(transpiles(contents)).toBe(true);
  });

  it('omits ShortNote field for entries without module', () => {
    const { contents } = emitRegistry(entries, []);
    expect(contents).not.toMatch(/ShortNote:/);
  });

  it('sorts entries by id deterministically', () => {
    const reversed = [...entries].reverse();
    const { contents } = emitRegistry(reversed, []);
    const firstIdx = contents.indexOf('"amoxicillin"');
    const secondIdx = contents.indexOf('"vancomycin"');
    expect(firstIdx).toBeLessThan(secondIdx);
  });
});
