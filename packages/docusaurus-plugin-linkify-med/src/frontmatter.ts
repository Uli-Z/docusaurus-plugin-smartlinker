import matter from 'gray-matter';
import { z } from 'zod';
import type {
  RawDocFile,
  FrontmatterParseResult,
  FrontmatterParseFileResult,
  IndexRawEntry,
  FrontmatterWarning,
} from './types.js';

const SupportedExt = new Set(['.md', '.mdx']);

const FM = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().optional(),
  'auto-link': z.array(z.string()).optional(),
  linkify: z.boolean().optional(),
  'auto-link-icon': z.string().optional(),
  'auto-link-short-note': z.string().optional()
});

function isSupportedExt(path: string, extOverride?: string): boolean {
  const ext = (extOverride ?? path.slice(path.lastIndexOf('.'))).toLowerCase();
  return SupportedExt.has(ext as any);
}

function normalizeAutoLinkTerms(list: unknown[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const value of list) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(trimmed);
  }
  return terms;
}

export function parseFrontmatterFile(file: RawDocFile): FrontmatterParseFileResult {
  const warnings: FrontmatterWarning[] = [];

  if (!isSupportedExt(file.path, file.ext)) {
    warnings.push({
      path: file.path,
      code: 'UNSUPPORTED_EXT',
      message: 'Unsupported extension (only .md/.mdx are processed).'
    });
    return { warnings };
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
      return { warnings };
    }

    const fm = res.data;

    const linkify = fm.linkify ?? true;
    if (!linkify) {
      warnings.push({
        path: file.path,
        code: 'LINKIFY_FALSE',
        message: '`linkify:false` – skipped from index.'
      });
      return { warnings };
    }

    const hasAutoLinkField = Object.prototype.hasOwnProperty.call(fm, 'auto-link');
    const autoLinkRaw = (fm as any)['auto-link'];

    if (!hasAutoLinkField || typeof autoLinkRaw === 'undefined') {
      return { warnings };
    }

    if (!Array.isArray(autoLinkRaw)) {
      warnings.push({
        path: file.path,
        code: 'INVALID_TYPE',
        message: '`auto-link` must be an array of strings.'
      });
      return { warnings };
    }

    const terms = normalizeAutoLinkTerms(autoLinkRaw);
    if (terms.length === 0) {
      warnings.push({
        path: file.path,
        code: 'EMPTY_AUTO_LINK',
        message: '`auto-link` must include at least one non-empty string.'
      });
      return { warnings };
    }

    const id = (fm.id ?? '').trim();
    if (!id) {
      warnings.push({
        path: file.path,
        code: 'EMPTY_ID',
        message: 'Missing required `id`.'
      });
      return { warnings };
    }

    const slug = (fm.slug ?? '').trim();
    if (!slug) {
      warnings.push({
        path: file.path,
        code: 'EMPTY_SLUG',
        message: 'Missing required `slug`.'
      });
      return { warnings };
    }
    if (!slug.startsWith('/')) {
      warnings.push({
        path: file.path,
        code: 'INVALID_TYPE',
        message: '`slug` must start with `/`.',
        details: { slug }
      });
      return { warnings };
    }

    const shortRaw = typeof (fm as any)['auto-link-short-note'] === 'string'
      ? (fm as any)['auto-link-short-note'].trim()
      : '';
    const shortNote = shortRaw ? shortRaw : undefined;

    const iconRaw = typeof (fm as any)['auto-link-icon'] === 'string'
      ? (fm as any)['auto-link-icon'].trim()
      : '';
    const icon = iconRaw ? iconRaw : undefined;

    const entry: IndexRawEntry = {
      id,
      slug,
      terms,
      linkify: true,
      icon,
      shortNote,
      sourcePath: file.path
    };

    return { entry, warnings };
  } catch (err: any) {
    warnings.push({
      path: file.path,
      code: 'INVALID_TYPE',
      message: 'Failed to parse frontmatter.',
      details: { error: String(err?.message ?? err) }
    });
    return { warnings };
  }
}

export function parseFrontmatter(files: RawDocFile[]): FrontmatterParseResult {
  const entries: IndexRawEntry[] = [];
  const warnings: FrontmatterWarning[] = [];

  for (const file of files) {
    const { entry, warnings: fileWarnings } = parseFrontmatterFile(file);
    if (entry) entries.push(entry);
    if (fileWarnings.length > 0) warnings.push(...fileWarnings);
  }

  return { entries, warnings };
}
