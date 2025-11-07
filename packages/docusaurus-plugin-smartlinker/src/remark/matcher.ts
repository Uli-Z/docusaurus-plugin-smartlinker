export interface AutoLinkEntry {
  /** Original casing as authored in config/frontmatter */
  literal: string;
  /** Canonical grouping key (e.g., target id) */
  key: string;
}

export interface Match {
  start: number;
  end: number;
  text: string;
  key: string;
  term: string;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  /** If terminal, we can store multiple variants mapping to the same canonical key; we’ll keep the longest on scan */
  terminals?: { literal: string; key: string }[];
}

export interface Matcher {
  findAll(text: string): Match[];
}

function isWordChar(ch: string): boolean {
  // Word = Unicode letter/number/mark or connector punctuation (e.g., underscore)
  // - Include \p{M} to handle combining marks so decomposed diacritics don't break words
  // - Exclude dashes (\p{Pd}) and quotes/apostrophes so hyphens and elisions form boundaries
  // - Keep ASCII underscore via \p{Pc}
  return /\p{L}|\p{N}|\p{M}|\p{Pc}/u.test(ch);
}

function buildTrie(entries: AutoLinkEntry[]): TrieNode {
  const root: TrieNode = { children: new Map() };
  for (const e of entries) {
    if (!e?.literal) continue;
    const lit = e.literal.toLocaleLowerCase();
    if (!lit) continue;

    let node = root;
    for (const ch of Array.from(lit)) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map() };
        node.children.set(ch, next);
      }
      node = next;
    }
    if (!node.terminals) node.terminals = [];
    node.terminals.push({ literal: e.literal, key: e.key });
  }
  return root;
}

export function buildMatcher(entries: AutoLinkEntry[]): Matcher {
  // Normalize: remove duplicates by (key,literal lower)
  const seen = new Set<string>();
  const uniq: AutoLinkEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e.literal !== 'string' || typeof e.key !== 'string') continue;
    const lit = e.literal.trim();
    const key = e.key.trim();
    if (!lit || !key) continue;
    const k = `${key}::${lit.toLocaleLowerCase()}`;
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push({ literal: lit, key });
    }
  }

  const trie = buildTrie(uniq);

  function findAll(text: string): Match[] {
    const out: Match[] = [];
    if (!text) return out;

    const lower = text.toLocaleLowerCase();
    const chars = Array.from(lower); // Unicode-safe indexing for scanning
    const orig = Array.from(text);

    let i = 0;
    while (i < chars.length) {
      let node: TrieNode | undefined = trie;
      let j = i;
      let bestEnd = -1;
      let bestTerminal: { literal: string; key: string } | null = null;

      while (node && j < chars.length) {
        const ch = chars[j];
        node = node.children.get(ch);
        if (!node) break;
        if (node.terminals && node.terminals.length) {
          // Pick the longest terminal literal at this end position
          let t = node.terminals[0];
          for (const cand of node.terminals) {
            if (Array.from(cand.literal).length > Array.from(t.literal).length) {
              t = cand;
            }
          }
          bestEnd = j + 1;
          bestTerminal = t;
        }
        j++;
      }

      if (bestEnd !== -1 && bestTerminal) {
        // Word boundary check around [i, bestEnd)
        const leftOk = i === 0 || !isWordChar(orig[i - 1] ?? '');
        const rightOk = bestEnd === chars.length || !isWordChar(orig[bestEnd] ?? '');
        if (leftOk && rightOk) {
          const start = i;
          const end = bestEnd;
          const textSlice = orig.slice(start, end).join('');
          out.push({ start, end, text: textSlice, key: bestTerminal.key, term: bestTerminal.literal });
          i = end; // non-overlapping
          continue;
        }
      }

      i += 1;
    }

    return out;
  }

  return { findAll };
}

