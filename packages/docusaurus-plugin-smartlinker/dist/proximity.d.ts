import type { IndexRawEntry } from './types.js';
export declare function distance(from: string, to: string): number;
export interface CollisionWarning {
    term: string;
    fromPath: string;
    candidates: {
        id: string;
        slug: string;
        sourcePath: string;
    }[];
    chosenId?: string;
    code: 'COLLISION_TIE';
    message: string;
}
export declare function resolveCollision(term: string, fromPath: string, candidates: IndexRawEntry[]): {
    chosen: IndexRawEntry | null;
    warnings: CollisionWarning[];
};
//# sourceMappingURL=proximity.d.ts.map