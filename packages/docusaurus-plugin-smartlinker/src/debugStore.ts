import type { DebugOptions } from './options.js';

const GLOBAL_KEY = Symbol.for('docusaurus-plugin-smartlinker.debug');

export function setDebugConfig(config: DebugOptions | undefined): void {
  const store = globalThis as Record<PropertyKey, unknown>;
  if (!config) {
    delete store[GLOBAL_KEY];
  } else {
    store[GLOBAL_KEY] = config;
  }
}

export function getDebugConfig(): DebugOptions | undefined {
  const store = globalThis as Record<PropertyKey, unknown>;
  const value = store[GLOBAL_KEY];
  if (value && typeof value === 'object') return value as DebugOptions;
  return undefined;
}

