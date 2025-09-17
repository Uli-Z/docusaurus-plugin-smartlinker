import { readdirSync, readFileSync, statSync } from 'node:fs';
import type { Stats } from 'node:fs';
import { join } from 'node:path';
import type { RawDocFile } from '../types.js';

const IGNORE = new Set(['node_modules', '.docusaurus', 'build', '.git']);

export interface ScanOptions {
  roots: string[];                 // absolute directories to scan
  exts?: ('.md'|'.mdx')[];
}

export interface MdFileStat {
  path: string;
  mtimeMs: number;
  ext: '.md' | '.mdx';
}

type FileVisitor = (params: { path: string; ext: '.md' | '.mdx'; stats: Stats }) => void;

function visitMarkdownFiles(roots: string[], exts: Set<string>, visitor: FileVisitor) {
  for (const root of roots) {
    walk(root);
  }

  function walk(dir: string) {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (IGNORE.has(name)) continue;
      const p = join(dir, name);
      let s: Stats;
      try {
        s = statSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        walk(p);
      } else {
        const low = name.toLowerCase();
        const dot = low.lastIndexOf('.');
        const ext = dot >= 0 ? low.slice(dot) : '';
        if (exts.has(ext as any)) {
          visitor({ path: p, ext: ext as '.md' | '.mdx', stats: s });
        }
      }
    }
  }
}

export function scanMdFiles(opts: ScanOptions): RawDocFile[] {
  const exts = new Set(opts.exts ?? ['.md', '.mdx']);

  const files: RawDocFile[] = [];
  visitMarkdownFiles(opts.roots, exts, ({ path, ext }) => {
    const content = readFileSync(path, 'utf8');
    files.push({ path, content, ext });
  });
  return files;
}

export function scanMdFileStats(opts: ScanOptions): MdFileStat[] {
  const exts = new Set(opts.exts ?? ['.md', '.mdx']);
  const stats: MdFileStat[] = [];
  visitMarkdownFiles(opts.roots, exts, ({ path, stats: fileStats, ext }) => {
    stats.push({ path, mtimeMs: fileStats.mtimeMs, ext });
  });
  return stats;
}

