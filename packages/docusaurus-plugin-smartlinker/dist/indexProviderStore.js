const GLOBAL_KEY = Symbol.for('docusaurus-plugin-smartlinker.indexProvider');
let currentProvider;
function readGlobalProvider() {
    const store = globalThis;
    const value = store[GLOBAL_KEY];
    if (value && typeof value === 'object') {
        return value;
    }
    return undefined;
}
function writeGlobalProvider(provider) {
    const store = globalThis;
    if (!provider) {
        delete store[GLOBAL_KEY];
    }
    else {
        store[GLOBAL_KEY] = provider;
    }
}
function toTargets(entries) {
    return entries.map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        icon: entry.icon,
        sourcePath: entry.sourcePath,
        terms: entry.terms,
        folderId: entry.folderId ?? null,
    }));
}
export function setIndexEntries(entries) {
    const targets = toTargets(entries);
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
export function getIndexProvider() {
    return currentProvider ?? readGlobalProvider();
}
export function clearIndexProvider() {
    currentProvider = undefined;
    writeGlobalProvider(undefined);
}
//# sourceMappingURL=indexProviderStore.js.map