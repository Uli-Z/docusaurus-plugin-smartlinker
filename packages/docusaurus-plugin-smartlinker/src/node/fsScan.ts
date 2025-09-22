import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RawDocFile } from '../types.js';

const IGNORE = new Set(['node_modules', '.docusaurus', 'build', '.git']);

export interface ScanOptions {
  roots: string[];                 // absolute directories to scan
  exts?: ('.md'|'.mdx')[];
}

export function scanMdFiles(opts: ScanOptions): RawDocFile[] {
  const exts = new Set(opts.exts ?? ['.md', '.mdx']);

  const files: RawDocFile[] = [];
  for (const root of opts.roots) {
    walk(root, root);
  }
  return files;

  function walk(dir: string, root: string) {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (IGNORE.has(name)) continue;
      const p = join(dir, name);
      let s;
      try {
        s = statSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        walk(p, root);
      } else {
        const low = name.toLowerCase();
        const dot = low.lastIndexOf('.');
        const ext = dot >= 0 ? low.slice(dot) : '';
        if (exts.has(ext as any)) {
          const content = readFileSync(p, 'utf8');
          const rel = relative(root, p).replace(/\\/g, '/');
          files.push({ path: p, content, relativePath: rel });
        }
      }
    }
  }
}

