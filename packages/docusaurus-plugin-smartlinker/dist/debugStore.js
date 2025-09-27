const GLOBAL_KEY = Symbol.for('docusaurus-plugin-smartlinker.debug');
export function setDebugConfig(config) {
    const store = globalThis;
    if (!config) {
        delete store[GLOBAL_KEY];
    }
    else {
        store[GLOBAL_KEY] = config;
    }
}
export function getDebugConfig() {
    const store = globalThis;
    const value = store[GLOBAL_KEY];
    if (value && typeof value === 'object')
        return value;
    return undefined;
}
//# sourceMappingURL=debugStore.js.map