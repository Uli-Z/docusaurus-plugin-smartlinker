import { describe, it, expect } from 'vitest';
import { buildMatcher, type AutoLinkEntry } from '../src/matcher.js';

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

    // Expected: "Amoxi" at 0..5, "Amoxicillin" at 11..22, "Vanco" at 24..29, "Amoxi" at 31..36 (indices by code unit with Array.from)
    const strings = matches.map(x => x.text);
    expect(strings).toEqual(['Amoxi', 'Amoxicillin', 'Vanco', 'Amoxi']);

    // Canonical keys preserved
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
    expect(matches[0].text).toBe('Amoxicillin'); // longest
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
    // Should match "cefuroxim" (case-insensitive),
    // "Ärzte",
    // and the final "ß-Laktam." (with boundary before '.'), but NOT "ß-LaktamaseX"
    const strs = matches.map(m => m.text);
    expect(strs).toEqual(['cefuroxim', 'Ärzte', 'ß-Laktam']);
  });

  it('respects word boundaries (no mid-token links)', () => {
    const entries: AutoLinkEntry[] = [
      { literal: 'Amoxi', key: 'amoxicillin' },
    ];
    const m = buildMatcher(entries);
    const text = 'fooAmoxi bar; AmoxiX; (Amoxi); Amoxi.';
    const matches = m.findAll(text);
    // Should match "(Amoxi)" and "Amoxi." only
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

describe('performance smoke (loose)', () => {
  it('handles long text reasonably fast (smoke test)', () => {
    const terms: AutoLinkEntry[] = [];
    for (let i = 0; i < 2000; i++) {
      terms.push({ literal: `Drug${i}`, key: `k${i}` });
    }
    const m = buildMatcher(terms);
    const long = Array.from({ length: 200000 }).map((_, i) => (i % 1000 === 0 ? 'Drug123 ' : 'a')).join('');
    const t0 = Date.now();
    const res = m.findAll(long);
    const t1 = Date.now();
    expect(res.length).toBeGreaterThan(0);
    expect(t1 - t0).toBeLessThan(3000); // 3s smoke threshold; adjust if flaky on CI
  });
});

