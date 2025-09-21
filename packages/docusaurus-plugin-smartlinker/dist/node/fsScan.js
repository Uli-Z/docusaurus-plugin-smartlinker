import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const IGNORE = new Set(['node_modules', '.docusaurus', 'build', '.git']);
export function scanMdFiles(opts) {
    const exts = new Set(opts.exts ?? ['.md', '.mdx']);
    const files = [];
    for (const root of opts.roots) {
        walk(root);
    }
    return files;
    function walk(dir) {
        let entries = [];
        try {
            entries = readdirSync(dir);
        }
        catch {
            return;
        }
        for (const name of entries) {
            if (IGNORE.has(name))
                continue;
            const p = join(dir, name);
            let s;
            try {
                s = statSync(p);
            }
            catch {
                continue;
            }
            if (s.isDirectory()) {
                walk(p);
            }
            else {
                const low = name.toLowerCase();
                const dot = low.lastIndexOf('.');
                const ext = dot >= 0 ? low.slice(dot) : '';
                if (exts.has(ext)) {
                    const content = readFileSync(p, 'utf8');
                    files.push({ path: p, content });
                }
            }
        }
    }
}
//# sourceMappingURL=fsScan.js.map