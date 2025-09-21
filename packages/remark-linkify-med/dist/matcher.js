function isWordChar(ch) {
    // Word = Unicode letter or number or underscore
    // NOTE: requires /u support; Node 18+ supports Unicode property escapes.
    // Fallback if needed: custom range checks; but we stick to \p classes for clarity.
    return /\p{L}|\p{N}|_/u.test(ch);
}
function buildTrie(entries) {
    const root = { children: new Map() };
    for (const e of entries) {
        if (!e?.literal)
            continue;
        const lit = e.literal.toLocaleLowerCase();
        if (!lit)
            continue;
        let node = root;
        for (const ch of Array.from(lit)) {
            let next = node.children.get(ch);
            if (!next) {
                next = { children: new Map() };
                node.children.set(ch, next);
            }
            node = next;
        }
        if (!node.terminals)
            node.terminals = [];
        node.terminals.push({ literal: e.literal, key: e.key });
    }
    return root;
}
export function buildMatcher(entries) {
    // Normalize: remove duplicates by (key,literal lower)
    const seen = new Set();
    const uniq = [];
    for (const e of entries) {
        if (!e || typeof e.literal !== 'string' || typeof e.key !== 'string')
            continue;
        const lit = e.literal.trim();
        const key = e.key.trim();
        if (!lit || !key)
            continue;
        const k = `${key}::${lit.toLocaleLowerCase()}`;
        if (!seen.has(k)) {
            seen.add(k);
            uniq.push({ literal: lit, key });
        }
    }
    const trie = buildTrie(uniq);
    function findAll(text) {
        const out = [];
        if (!text)
            return out;
        const lower = text.toLocaleLowerCase();
        const chars = Array.from(lower); // Unicode-safe indexing for scanning
        const orig = Array.from(text);
        let i = 0;
        while (i < chars.length) {
            let node = trie;
            let j = i;
            let bestEnd = -1;
            let bestTerminal = null;
            while (node && j < chars.length) {
                const ch = chars[j];
                node = node.children.get(ch);
                if (!node)
                    break;
                if (node.terminals && node.terminals.length) {
                    // Any terminal here; pick the terminal that has the longest literal by codepoints
                    // Since all terminals end at the same j, picking any is fine, but
                    // we keep the first; to be safe, prefer the longest literal to preserve original selection
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
                const leftOk = (i === 0) || !isWordChar(orig[i - 1] ?? '');
                const rightOk = (bestEnd === chars.length) || !isWordChar(orig[bestEnd] ?? '');
                if (leftOk && rightOk) {
                    const start = i;
                    const end = bestEnd;
                    const textSlice = orig.slice(start, end).join('');
                    out.push({
                        start,
                        end,
                        text: textSlice,
                        key: bestTerminal.key,
                        term: bestTerminal.literal
                    });
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
//# sourceMappingURL=matcher.js.map