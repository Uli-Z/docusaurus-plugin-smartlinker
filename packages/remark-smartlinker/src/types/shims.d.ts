declare module 'node:path' {
  export function normalize(path: string): string;
}

declare module 'node:perf_hooks' {
  export const performance: { now(): number };
}

