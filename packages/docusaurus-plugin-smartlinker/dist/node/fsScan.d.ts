import type { RawDocFile } from '../types.js';
export interface ScanOptions {
    roots: string[];
    exts?: ('.md' | '.mdx')[];
}
export declare function scanMdFiles(opts: ScanOptions): RawDocFile[];
//# sourceMappingURL=fsScan.d.ts.map