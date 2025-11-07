import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
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
  'smartlink-terms': z.array(z.string()).optional(),
  linkify: z.boolean().optional(),
  'smartlink-icon': z.string().optional(),
  'smartlink-short-note': z.string().optional()
});

function isSupportedExt(path: string, extOverride?: string): boolean {
  const ext = (extOverride ?? path.slice(path.lastIndexOf('.'))).toLowerCase();
  return SupportedExt.has(ext as any);
}

function normalizeSmartlinkTerms(list: unknown[]): string[] {
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

function pickRelativeCandidate(file: RawDocFile): string | null {
  if (typeof file.relativePath === 'string' && file.relativePath.trim()) {
    return file.relativePath.trim();
  }
  if (typeof file.path === 'string' && file.path.trim()) {
    const normalized = file.path.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(idx + 1) : normalized;
  }
  return null;
}

function inferDefaultSlug(file: RawDocFile): string | null {
  const candidate = pickRelativeCandidate(file);
  if (!candidate) return null;

  const normalized = candidate.replace(/\\/g, '/');
  const withoutLeading = normalized.replace(/^\.+\/+/, '').replace(/^\/+/, '');
  const collapsed = withoutLeading.replace(/\/+/g, '/');
  const withoutExt = collapsed.replace(/\.[^./]+$/, '');
  const trimmed = withoutExt.replace(/\/+$/, '');
  if (!trimmed) return null;
  return `/${trimmed}`;
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
      const content = (typeof file.content === 'string' && file.content.length > 0)
        ? file.content
        : (() => {
            try {
              return readFileSync(file.path, 'utf8');
            } catch {
              return '';
            }
          })();
      const { data } = matter(content);
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

      const hasSmartlinkTermsField = Object.prototype.hasOwnProperty.call(fm, 'smartlink-terms');
      const smartlinkTermsRaw = (fm as any)['smartlink-terms'];

      if (!hasSmartlinkTermsField || typeof smartlinkTermsRaw === 'undefined') {
        continue;
      }

      if (!Array.isArray(smartlinkTermsRaw)) {
        warnings.push({
          path: file.path,
          code: 'INVALID_TYPE',
          message: '`smartlink-terms` must be an array of strings.'
        });
        continue;
      }

      const terms = normalizeSmartlinkTerms(smartlinkTermsRaw);
      if (terms.length === 0) {
        warnings.push({
          path: file.path,
          code: 'EMPTY_SMARTLINK_TERMS',
          message: '`smartlink-terms` must include at least one non-empty string.'
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

      let slug = (fm.slug ?? '').trim();
      if (!slug) {
        slug = inferDefaultSlug(file) ?? '';
      }
      if (!slug) {
        warnings.push({
          path: file.path,
          code: 'MISSING_REQUIRED',
          message: 'Unable to determine slug – please add a `slug` or ensure file path can be inferred.'
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

      const shortRaw = typeof (fm as any)['smartlink-short-note'] === 'string'
        ? (fm as any)['smartlink-short-note'].trim()
        : '';
      const shortNote = shortRaw ? shortRaw : undefined;

      const iconRaw = typeof (fm as any)['smartlink-icon'] === 'string'
        ? (fm as any)['smartlink-icon'].trim()
        : '';
      const icon = iconRaw ? iconRaw : undefined;

      entries.push({
        id,
        slug,
        terms,
        linkify: true,
        icon,
        shortNote,
        sourcePath: file.path,
        folderId: file.folderId
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
