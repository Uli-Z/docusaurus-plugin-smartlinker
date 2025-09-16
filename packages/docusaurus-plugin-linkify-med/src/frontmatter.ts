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

function cleanHeadingText(text: string): string {
  let t = text.trim();
  if (!t) return '';
  t = t.replace(/\s+#+\s*$/, '');
  t = t.replace(/\s*\{#.+\}\s*$/, '');
  t = t.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');
  t = t.replace(/~~([^~]+)~~/g, '$1');
  t = t.replace(/<\/?.+?>/g, '');
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

function extractFirstHeadingTitle(body: string): string {
  if (!body) return '';
  const lines = body.split(/\r?\n/);
  let inFence = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^#{1,6}\s+(.+)$/.exec(line);
    if (match) {
      const cleaned = cleanHeadingText(match[1]);
      if (cleaned) return cleaned;
    }
  }
  return '';
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  if (word.length === 1) return word.toLocaleUpperCase();
  return word[0].toLocaleUpperCase() + word.slice(1);
}

function slugToTitle(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return '';
  const parts = trimmed.split('/').filter(Boolean);
  if (!parts.length) return '';
  const last = parts[parts.length - 1] ?? '';
  const base = last.replace(/\.[^./]+$/, '');
  if (!base) return '';
  const segments = base.split(/[-_]/).filter(Boolean);
  if (!segments.length) {
    return capitalizeWord(base);
  }
  const words = segments.map(capitalizeWord).filter(Boolean);
  const candidate = words.join(' ').trim();
  return candidate || capitalizeWord(base);
}

function pushUnique(list: string[], seen: Set<string>, value: string | undefined): void {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed) return;
  const key = trimmed.toLocaleLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push(trimmed);
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
      const { data, content: bodyContent } = matter(file.content ?? '');
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

      const explicitTitle = typeof fm.title === 'string' ? fm.title.trim() : '';
      const headingTitle = explicitTitle ? '' : extractFirstHeadingTitle(bodyContent ?? '');
      const canonicalTitle = explicitTitle || headingTitle;
      const canonicalTitleLower = canonicalTitle ? canonicalTitle.toLocaleLowerCase() : '';
      const slugTitle = slug ? slugToTitle(slug) : '';

      const seenSynonyms = new Set<string>();
      const synonyms: string[] = [];

      pushUnique(synonyms, seenSynonyms, canonicalTitle);

      if (slugTitle) {
        const slugLower = slugTitle.toLocaleLowerCase();
        if (!canonicalTitleLower || canonicalTitleLower.startsWith(slugLower)) {
          pushUnique(synonyms, seenSynonyms, slugTitle);
        }
      }

      for (const syn of normalizedSynonyms) {
        pushUnique(synonyms, seenSynonyms, syn);
      }

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
