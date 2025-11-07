import { describe, it, expect } from 'vitest';
import { buildMatcher, type AutoLinkEntry } from '../src/matcher.js';

describe('matcher i18n and boundaries', () => {
  it('matches after French elision apostrophe (U+2019 and ASCII)', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'amoxicilline', key: 'amoxicilline' },
    ];
    const m = buildMatcher(entries);

    const textCurly = "l’amoxicilline est utilisée."; // U+2019
    const textAscii = "l'amoxicilline est utilisée."; // ASCII '
    const resCurly = m.findAll(textCurly);
    const resAscii = m.findAll(textAscii);

    expect(resCurly.map(x => x.text)).toEqual(['amoxicilline']);
    expect(resAscii.map(x => x.text)).toEqual(['amoxicilline']);
  });

  it('handles umlauts and eszett with punctuation boundaries', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'Ärzte', key: 'doctors' },
      { literal: 'ß-Laktam', key: 'beta-lactam' },
    ];
    const m = buildMatcher(entries);
    const text = 'Ärzte! Nicht ß-Laktamase, aber ß-Laktam.';
    const res = m.findAll(text);
    expect(res.map(x => x.text)).toEqual(['Ärzte', 'ß-Laktam']);
  });

  it('treats hyphen as boundary for trailing suffixes', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'Amoxicillin', key: 'amoxicillin' },
    ];
    const m = buildMatcher(entries);
    const text = 'Use Amoxicillin-like dosing.';
    const res = m.findAll(text);
    expect(res.map(x => x.text)).toEqual(['Amoxicillin']);
  });
});

