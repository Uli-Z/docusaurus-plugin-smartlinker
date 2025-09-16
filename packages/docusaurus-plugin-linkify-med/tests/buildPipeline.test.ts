import { describe, it, expect } from 'vitest';
import { buildArtifacts } from '../src/node/buildPipeline.js';

describe('buildArtifacts (pure pipeline)', async () => {
  it('parses entries, compiles notes, and emits registry', async () => {
    const files = [
      {
        path: '/docs/amoxi.mdx',
        content: `---
id: amoxicillin
slug: /antibiotics/amoxicillin
synonyms: [Amoxi]
shortNote: "**Note**"
---
Body`
      },
      {
        path: '/docs/vanco.md',
        content: `---
id: vancomycin
slug: /antibiotics/vancomycin
synonyms: [Vanco]
---
Body`
      }
    ];

    const { entries, notes, registry } = await buildArtifacts(files);
    expect(entries.map(e => e.id).sort()).toEqual(['amoxicillin', 'vancomycin']);
    expect(notes.length).toBe(1);
    expect(notes[0].filename).toMatch(/^notes\/amoxicillin\.js$/);
    expect(registry.filename).toBe('registry.js');
    expect(registry.contents).toContain('export const registry');
    expect(registry.contents).toContain('ShortNote as ShortNote_amoxicillin');
  });
});

