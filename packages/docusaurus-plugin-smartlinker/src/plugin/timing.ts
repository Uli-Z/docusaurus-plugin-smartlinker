import type { LogLevel } from '../logger.js';
import { performance } from 'node:perf_hooks';

export const shouldMeasure = (
  log: { isLevelEnabled(level: LogLevel): boolean },
  ...levels: LogLevel[]
): boolean => levels.some((level) => log.isLevelEnabled(level));

export const startTimer = (
  log: { isLevelEnabled(level: LogLevel): boolean },
  ...levels: LogLevel[]
): number | null => (shouldMeasure(log, ...levels) ? performance.now() : null);

export const endTimer = (start: number | null): number | undefined => {
  if (start === null) return undefined;
  return Number((performance.now() - start).toFixed(2));
};

