import { isAbsolute, relative, resolve } from 'node:path';

/**
 * Normalize a folder identifier using a site-relative path when possible.
 */
export function normalizeFolderId(siteDir: string, absPath: string): string {
  const relPath = relative(siteDir, absPath);
  const useRelative = relPath && !relPath.startsWith('..') && !isAbsolute(relPath);
  const candidate = useRelative ? relPath : absPath;
  const normalized = candidate.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized || '.';
}

/**
 * Convert an input path to a normalized absolute path within the site.
 */
export function normalizeFsPath(siteDir: string, filePath: string): string {
  if (!filePath) {
    return siteDir.replace(/\\/g, '/');
  }
  const abs = isAbsolute(filePath) ? filePath : resolve(siteDir, filePath);
  return abs.replace(/\\/g, '/');
}

/**
 * Present a path relative to the site directory when possible.
 */
export function formatSiteRelativePath(siteDir: string, absPath: string): string {
  const relPath = relative(siteDir, absPath);
  const useRel = relPath && !relPath.startsWith('..') && !isAbsolute(relPath);
  const normalized = (useRel ? relPath : absPath).replace(/\\/g, '/');
  return normalized || '.';
}

