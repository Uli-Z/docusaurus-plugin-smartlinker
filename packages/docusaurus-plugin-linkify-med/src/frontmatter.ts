import matter from 'gray-matter';
import { z } from 'zod';
import type {
  RawDocFile,
  FrontmatterParseResult,
  IndexRawEntry,
  FrontmatterWarning,
} from './types.js';

const SupportedExt = new Set(['.md', '.mdx']);

const FM = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  linkify: z.boolean().optional(),
  icon: z.string().optional(),
  shortNote: z.string().optional()
});

function isSupportedExt(path: string, extOverride?: string): boolean {
  const ext = (extOverride ?? path.slice(path.lastIndexOf('.'))).toLowerCase();
  return SupportedExt.has(ext as any);
}

function normalizeSynonyms(list: unknown): string[] | null {
  if (!Array.isArray(list)) return null;
  const out: string[] = [];
  for (const v of list) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t) continue;
    out.push(t);
  }
  // unique by lower-case
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const s of out) {
    const key = s.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(s);
    }
  }
  return uniq.length ? uniq : null;
}

export function parseFrontmatter(files: RawDocFile[]): FrontmatterParseResult {
  const entries: IndexRawEntry[] = [];
  const warnings: FrontmatterWarning[] = [];

  for (const file of files) {
    if (!isSupportedExt(file.path, file.ext)) {
      warnings.push({
        path: file.path,
        code: 'UNSUPPORTED_EXT',
        message: 'Unsupported extension (only .md/.mdx are processed).'
      });
      continue;
    }

    try {
      const { data } = matter(file.content ?? '');
      const res = FM.safeParse(data ?? {});
      if (!res.success) {
        warnings.push({
          path: file.path,
          code: 'INVALID_TYPE',
          message: 'Frontmatter has invalid shape.',
          details: { issues: res.error.issues.map(i => ({ path: i.path, message: i.message })) }
        });
        continue;
      }

      const fm = res.data;

      const linkify = fm.linkify ?? true;
      if (!linkify) {
        warnings.push({
          path: file.path,
          code: 'LINKIFY_FALSE',
          message: '`linkify:false` – skipped from index.'
        });
        continue;
      }

      const id = (fm.id ?? '').trim();
      if (!id) {
        warnings.push({
          path: file.path,
          code: 'EMPTY_ID',
          message: 'Missing required `id`.'
        });
        continue;
      }

      const slug = (fm.slug ?? '').trim();
      if (!slug) {
        warnings.push({
          path: file.path,
          code: 'EMPTY_SLUG',
          message: 'Missing required `slug`.'
        });
        continue;
      }
      if (!slug.startsWith('/')) {
        warnings.push({
          path: file.path,
          code: 'INVALID_TYPE',
          message: '`slug` must start with `/`.',
          details: { slug }
        });
        continue;
      }

      const normalizedSynonyms = normalizeSynonyms(fm.synonyms);
      if (!normalizedSynonyms) {
        warnings.push({
          path: file.path,
          code: 'EMPTY_SYNONYMS',
          message: '`synonyms` must be a non-empty array of non-empty strings.'
        });
        continue;
      }

      const title = typeof fm.title === 'string' ? fm.title.trim() : '';
      const lowerSynonyms = new Set(normalizedSynonyms.map(s => s.toLocaleLowerCase()));
      const synonyms =
        title && !lowerSynonyms.has(title.toLocaleLowerCase())
          ? [title, ...normalizedSynonyms]
          : normalizedSynonyms;

      const shortRaw = typeof fm.shortNote === 'string' ? fm.shortNote.trim() : '';
      const shortNote = shortRaw ? shortRaw : undefined;

      const icon = typeof fm.icon === 'string' && fm.icon.trim() ? fm.icon.trim() : undefined;

      entries.push({
        id,
        slug,
        synonyms: synonyms.map(s => s), // keep original case for display; lower-casing is for matching later
        linkify: true,
        icon,
        shortNote,
        sourcePath: file.path
      });
    } catch (err: any) {
      warnings.push({
        path: file.path,
        code: 'INVALID_TYPE',
        message: 'Failed to parse frontmatter.',
        details: { error: String(err?.message ?? err) }
      });
      continue;
    }
  }

  return { entries, warnings };
}
