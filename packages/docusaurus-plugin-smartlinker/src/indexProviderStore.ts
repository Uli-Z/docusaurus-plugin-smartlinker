import type { IndexRawEntry } from './types.js';
import type { IndexProvider, TargetInfo } from './fsIndexProvider.js';

const GLOBAL_KEY = Symbol.for('docusaurus-plugin-smartlinker.indexProvider');

let currentProvider: IndexProvider | undefined;

function readGlobalProvider(): IndexProvider | undefined {
  const store = globalThis as Record<PropertyKey, unknown>;
  const value = store[GLOBAL_KEY];
  if (value && typeof value === 'object') {
    return value as IndexProvider;
  }
  return undefined;
}

function writeGlobalProvider(provider: IndexProvider | undefined): void {
  const store = globalThis as Record<PropertyKey, unknown>;
  if (!provider) {
    delete store[GLOBAL_KEY];
  } else {
    store[GLOBAL_KEY] = provider;
  }
}

function toTargets(entries: IndexRawEntry[], slugPrefix: string): TargetInfo[] {
  return entries.map((entry) => ({
    id: entry.id,
    slug: `${slugPrefix}${entry.slug}`,
    icon: entry.icon,
    sourcePath: entry.sourcePath,
    terms: entry.terms,
  }));
}

export function setIndexEntries(entries: IndexRawEntry[], slugPrefix?: string): void {
  const prefix = slugPrefix ?? '';
  const targets = toTargets(entries, prefix);

  currentProvider = {
    getAllTargets() {
      return targets;
    },
    getCurrentFilePath(file) {
      if (file && typeof file.path === 'string') {
        return file.path;
      }
      return '';
    },
  };

  writeGlobalProvider(currentProvider);
}

export function getIndexProvider(): IndexProvider | undefined {
  return currentProvider ?? readGlobalProvider();
}

export function clearIndexProvider(): void {
  currentProvider = undefined;
  writeGlobalProvider(undefined);
}
