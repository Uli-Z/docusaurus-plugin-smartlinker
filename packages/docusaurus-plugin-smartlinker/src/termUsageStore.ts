import { isAbsolute, normalize, resolve } from 'node:path';

interface TermUsageState {
  byTerm: Map<string, Set<string>>;
  byDoc: Map<string, Set<string>>;
}

const GLOBAL_KEY = Symbol.for('docusaurus-plugin-smartlinker.termUsage');

type GlobalStore = Record<PropertyKey, unknown>;

function getState(): TermUsageState {
  const store = globalThis as GlobalStore;
  const existing = store[GLOBAL_KEY];
  if (
    existing &&
    typeof existing === 'object' &&
    existing instanceof Object &&
    'byTerm' in (existing as any) &&
    'byDoc' in (existing as any)
  ) {
    const candidate = existing as TermUsageState;
    if (candidate.byTerm instanceof Map && candidate.byDoc instanceof Map) {
      return candidate;
    }
  }

  const fresh: TermUsageState = {
    byTerm: new Map<string, Set<string>>(),
    byDoc: new Map<string, Set<string>>(),
  };
  store[GLOBAL_KEY] = fresh;
  return fresh;
}

function normalizeDocPath(docPath: string | null | undefined): string | null {
  if (!docPath || typeof docPath !== 'string') return null;
  const trimmed = docPath.trim();
  if (!trimmed) return null;
  const abs = isAbsolute(trimmed) ? trimmed : resolve(trimmed);
  try {
    return normalize(abs).replace(/\\/g, '/');
  } catch {
    return abs.replace(/\\/g, '/');
  }
}

function updateTermBindings(
  state: TermUsageState,
  docPath: string,
  nextTerms: Set<string>,
): void {
  const prevTerms = state.byDoc.get(docPath);
  if (prevTerms) {
    for (const term of prevTerms) {
      const docs = state.byTerm.get(term);
      if (!docs) continue;
      docs.delete(docPath);
      if (docs.size === 0) {
        state.byTerm.delete(term);
      }
    }
  }

  if (nextTerms.size === 0) {
    state.byDoc.delete(docPath);
    return;
  }

  state.byDoc.set(docPath, nextTerms);
  for (const term of nextTerms) {
    const docs = state.byTerm.get(term) ?? new Set<string>();
    docs.add(docPath);
    state.byTerm.set(term, docs);
  }
}

export function updateDocTermUsage(
  docPath: string | null | undefined,
  termIds: Iterable<string>,
): void {
  const normalizedPath = normalizeDocPath(docPath);
  if (!normalizedPath) return;

  const terms = new Set<string>();
  for (const id of termIds) {
    if (!id) continue;
    const trimmed = `${id}`.trim();
    if (!trimmed) continue;
    terms.add(trimmed);
  }

  const state = getState();
  updateTermBindings(state, normalizedPath, terms);
}

export function removeDocTermUsage(docPath: string | null | undefined): void {
  updateDocTermUsage(docPath, []);
}

export function getDocsReferencingTerms(termIds: Iterable<string>): string[] {
  const state = getState();
  const docs = new Set<string>();
  for (const id of termIds) {
    if (!id) continue;
    const trimmed = `${id}`.trim();
    if (!trimmed) continue;
    const registered = state.byTerm.get(trimmed);
    if (!registered) continue;
    for (const doc of registered) {
      docs.add(doc);
    }
  }
  return Array.from(docs);
}

export function resetTermUsage(): void {
  const state = getState();
  state.byTerm.clear();
  state.byDoc.clear();
}
