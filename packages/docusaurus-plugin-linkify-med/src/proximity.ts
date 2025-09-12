import type { IndexRawEntry } from './types';

export function distance(from: string, to: string): number {
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

function norm(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

export interface CollisionWarning {
  synonym: string;
  fromPath: string;
  candidates: { id: string; slug: string; sourcePath: string }[];
  chosenId?: string;
  code: 'COLLISION_TIE';
  message: string;
}

export function resolveCollision(
  synonym: string,
  fromPath: string,
  candidates: IndexRawEntry[]
): { chosen: IndexRawEntry | null; warnings: CollisionWarning[] } {
  if (!candidates.length) return { chosen: null, warnings: [] };
  if (candidates.length === 1) return { chosen: candidates[0], warnings: [] };

  let best: IndexRawEntry[] = [];
  let bestDist = Infinity;

  for (const c of candidates) {
    const d = distance(fromPath, c.sourcePath);
    if (d < bestDist) {
      bestDist = d;
      best = [c];
    } else if (d === bestDist) {
      best.push(c);
    }
  }

  if (best.length === 1) {
    return { chosen: best[0], warnings: [] };
  }

  // Tie: lexicographic slug
  const sorted = [...best].sort((a, b) => a.slug.localeCompare(b.slug));
  const chosen = sorted[0];

  const warnings: CollisionWarning[] = [
    {
      synonym,
      fromPath,
      candidates: best.map(c => ({ id: c.id, slug: c.slug, sourcePath: c.sourcePath })),
      chosenId: chosen.id,
      code: 'COLLISION_TIE',
      message: `Collision tie for synonym "${synonym}", multiple candidates at equal distance. Chose lexicographically smallest slug.`
    }
  ];

  return { chosen, warnings };
}
