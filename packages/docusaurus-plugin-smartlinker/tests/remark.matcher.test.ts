import { describe, it, expect } from 'vitest';
import { buildMatcher, type AutoLinkEntry } from '../src/remark/matcher.js';

describe('matcher basics', () => {
  it('finds all occurrences, non-overlapping, left-to-right', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'Amoxi', key: 'amoxicillin' },
      { literal: 'Amoxicillin', key: 'amoxicillin' },
      { literal: 'Vanco', key: 'vancomycin' },
    ];
    const m = buildMatcher(entries);

    const text = 'Amoxi and Amoxicillin; Vanco. Amoxi!';
    const matches = m.findAll(text);
    const strings = matches.map(x => x.text);
    expect(strings).toEqual(['Amoxi', 'Amoxicillin', 'Vanco', 'Amoxi']);
    expect(matches.map(x => x.key)).toEqual(['amoxicillin','amoxicillin','vancomycin','amoxicillin']);
  });

  it('prefers longest match at the same start', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'Amoxi', key: 'amoxicillin' },
      { literal: 'Amoxicillin', key: 'amoxicillin' },
    ];
    const m = buildMatcher(entries);
    const text = 'Amoxicillin is longer than Amoxi.';
    const matches = m.findAll(text);
    expect(matches[0].text).toBe('Amoxicillin');
  });

  it('is case-insensitive and Unicode-aware (umlauts, ß)', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'Cefuroxim', key: 'cefuroxime' },
      { literal: 'ß-Laktam', key: 'beta-lactam' },
      { literal: 'Ärzte', key: 'doctors' },
    ];
    const m = buildMatcher(entries);
    const text = 'cefuroxim und Ärzte, nicht ß-LaktamaseX aber ß-Laktam.';
    const matches = m.findAll(text);
    const strs = matches.map(m => m.text);
    expect(strs).toEqual(['cefuroxim', 'Ärzte', 'ß-Laktam']);
  });

  it('respects word boundaries (no mid-token links)', () => {
    const entries: AutoLinkEntry[] = [{ literal: 'Amoxi', key: 'amoxicillin' }];
    const m = buildMatcher(entries);
    const text = 'fooAmoxi bar; AmoxiX; (Amoxi); Amoxi.';
    const matches = m.findAll(text);
    const strs = matches.map(m => m.text);
    expect(strs).toEqual(['Amoxi', 'Amoxi']);
  });

  it('multi-word terms match across spaces/punctuation boundaries', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'Piperacillin Tazobactam', key: 'pip-tazo' },
      { literal: 'co-amoxiclav', key: 'amox-clav' },
    ];
    const m = buildMatcher(entries);
    const text = 'Use Piperacillin Tazobactam. co-amoxiclav is another.';
    const matches = m.findAll(text);
    expect(matches.map(m => m.text)).toEqual(['Piperacillin Tazobactam', 'co-amoxiclav']);
  });
});

describe('matcher i18n and boundaries', () => {
  it('matches after French elision apostrophe (U+2019 and ASCII)', () => {
    const entries: AutoLinkEntry[] = [ { literal: 'amoxicilline', key: 'amoxicilline' } ];
    const m = buildMatcher(entries);
    const textCurly = "l’amoxicilline est utilisée.";
    const textAscii = "l'amoxicilline est utilisée.";
    expect(m.findAll(textCurly).map(x => x.text)).toEqual(['amoxicilline']);
    expect(m.findAll(textAscii).map(x => x.text)).toEqual(['amoxicilline']);
  });
});

