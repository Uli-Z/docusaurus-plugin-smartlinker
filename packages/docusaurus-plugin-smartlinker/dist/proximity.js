export function distance(from, to) {
    const fromParts = norm(from).split('/');
    const toParts = norm(to).split('/');
    // drop file names
    fromParts.pop();
    toParts.pop();
    let i = 0;
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
        i++;
    }
    const up = fromParts.length - i;
    const down = toParts.length - i;
    return up + down;
}
function norm(path) {
    return path.replace(/\\/g, '/').replace(/^\/+/, '');
}
export function resolveCollision(term, fromPath, candidates) {
    if (!candidates.length)
        return { chosen: null, warnings: [] };
    if (candidates.length === 1)
        return { chosen: candidates[0], warnings: [] };
    let best = [];
    let bestDist = Infinity;
    for (const c of candidates) {
        const d = distance(fromPath, c.sourcePath);
        if (d < bestDist) {
            bestDist = d;
            best = [c];
        }
        else if (d === bestDist) {
            best.push(c);
        }
    }
    if (best.length === 1) {
        return { chosen: best[0], warnings: [] };
    }
    // Tie: lexicographic slug
    const sorted = [...best].sort((a, b) => a.slug.localeCompare(b.slug));
    const chosen = sorted[0];
    const warnings = [
        {
            term,
            fromPath,
            candidates: best.map(c => ({ id: c.id, slug: c.slug, sourcePath: c.sourcePath })),
            chosenId: chosen.id,
            code: 'COLLISION_TIE',
            message: `Collision tie for term "${term}", multiple candidates at equal distance. Chose lexicographically smallest slug.`
        }
    ];
    return { chosen, warnings };
}
//# sourceMappingURL=proximity.js.map