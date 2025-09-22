import type { DebugOptions } from './options.js';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LOG_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];
const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: '\u001b[31m',
  warn: '\u001b[33m',
  info: '\u001b[36m',
  debug: '\u001b[35m',
  trace: '\u001b[90m',
};

const COLOR_RESET = '\u001b[0m';

type LogDetailRecord = Record<string, unknown>;
type LogDetails = LogDetailRecord | (() => LogDetailRecord | undefined) | undefined;

type ConsoleMethod = (message?: any, ...optionalParams: any[]) => void;

export interface LoggerInit {
  pluginName: string;
  debug: DebugOptions;
  /**
   * Optionally override the process environment (used for tests).
   */
  env?: NodeJS.ProcessEnv;
  /**
   * Optionally override the timestamp factory (used for tests).
   */
  now?: () => Date;
}

export interface PluginLogger {
  level: LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
  log(level: LogLevel, context: string, message: string, details?: LogDetails): void;
  error(context: string, message: string, details?: LogDetails): void;
  warn(context: string, message: string, details?: LogDetails): void;
  info(context: string, message: string, details?: LogDetails): void;
  debug(context: string, message: string, details?: LogDetails): void;
  trace(context: string, message: string, details?: LogDetails): void;
  child(context: string): ContextLogger;
}

export interface ContextLogger {
  context: string;
  level: LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
  log(level: LogLevel, message: string, details?: LogDetails): void;
  error(message: string, details?: LogDetails): void;
  warn(message: string, details?: LogDetails): void;
  info(message: string, details?: LogDetails): void;
  debug(message: string, details?: LogDetails): void;
  trace(message: string, details?: LogDetails): void;
}

export interface DebugResolution {
  config: DebugOptions;
  source: 'config' | 'env';
  appliedOverrides: {
    enabled?: boolean;
    level?: LogLevel;
  };
  invalidLevel?: string;
}

function normalizeBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (['0', 'false', 'no', 'off', 'disable', 'disabled'].includes(normalized)) {
    return false;
  }
  if (['1', 'true', 'yes', 'on', 'enable', 'enabled'].includes(normalized)) {
    return true;
  }
  return true;
}

function normalizeLevel(value: string): LogLevel | undefined {
  const normalized = value.trim().toLowerCase();
  if (LOG_LEVELS.includes(normalized as LogLevel)) {
    return normalized as LogLevel;
  }
  return undefined;
}

function shouldUseColor(env: NodeJS.ProcessEnv | undefined): boolean {
  if (typeof process === 'undefined') {
    return false;
  }
  const stdout: typeof process.stdout | undefined = (process as any).stdout;
  if (!stdout || typeof stdout.isTTY !== 'boolean') {
    return false;
  }
  if (!stdout.isTTY) {
    return false;
  }
  const ci = env?.CI ?? process.env?.CI;
  if (typeof ci === 'string' && ci !== '' && ci !== '0' && ci.toLowerCase() !== 'false') {
    return false;
  }
  return true;
}

function getConsoleMethod(level: LogLevel): ConsoleMethod {
  if (level === 'error' && typeof console.error === 'function') {
    return console.error.bind(console);
  }
  if (level === 'warn' && typeof console.warn === 'function') {
    return console.warn.bind(console);
  }
  return typeof console.log === 'function' ? console.log.bind(console) : () => {};
}

function formatFieldValue(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    if (!value) {
      return "''";
    }
    if (/\s/.test(value) || /["'\\]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDetails(details: LogDetailRecord | undefined): string {
  if (!details) {
    return '';
  }
  const parts: string[] = [];
  for (const [key, rawValue] of Object.entries(details)) {
    const formatted = formatFieldValue(rawValue);
    if (formatted === undefined) continue;
    parts.push(`${key}=${formatted}`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function resolveDetails(details: LogDetails): LogDetailRecord | undefined {
  if (!details) {
    return undefined;
  }
  if (typeof details === 'function') {
    try {
      return details();
    } catch {
      return undefined;
    }
  }
  return details;
}

export function resolveDebugConfig(
  base: DebugOptions | undefined,
  env: NodeJS.ProcessEnv = process.env,
): DebugResolution {
  const fallback: DebugOptions = base ?? { enabled: false, level: 'warn' };
  let enabled = fallback.enabled ?? false;
  let level: LogLevel = (fallback.level as LogLevel) ?? 'warn';
  let source: DebugResolution['source'] = 'config';
  const appliedOverrides: DebugResolution['appliedOverrides'] = {};
  let invalidLevel: string | undefined;

  const envEnabledRaw = env?.DOCUSAURUS_PLUGIN_DEBUG;
  if (typeof envEnabledRaw === 'string') {
    enabled = normalizeBoolean(envEnabledRaw);
    appliedOverrides.enabled = enabled;
    source = 'env';
  }

  const envLevelRaw = env?.DOCUSAURUS_PLUGIN_DEBUG_LEVEL;
  if (typeof envLevelRaw === 'string') {
    const normalized = normalizeLevel(envLevelRaw);
    if (normalized) {
      level = normalized;
      appliedOverrides.level = normalized;
      source = 'env';
    } else {
      invalidLevel = envLevelRaw;
    }
  }

  if (!LOG_LEVELS.includes(level)) {
    level = 'warn';
  }

  return {
    config: { enabled, level },
    source,
    appliedOverrides,
    invalidLevel,
  };
}

export function createLogger(init: LoggerInit): PluginLogger {
  const { pluginName, debug } = init;
  const env = init.env ?? process.env;
  const now = init.now ?? (() => new Date());

  const active = Boolean(debug?.enabled);
  const thresholdLevel: LogLevel = (debug?.level as LogLevel) ?? 'warn';
  const threshold = LEVEL_RANK[thresholdLevel] ?? LEVEL_RANK.warn;
  const colorize = shouldUseColor(env);

  const isLevelEnabled = (level: LogLevel): boolean => {
    if (!active) return false;
    return LEVEL_RANK[level] <= threshold;
  };

  const write = (level: LogLevel, context: string, message: string, details?: LogDetails) => {
    if (!isLevelEnabled(level)) {
      return;
    }
    const consoleMethod = getConsoleMethod(level);
    const timestamp = now().toISOString();
    const levelTag = `[${level.toUpperCase()}]`;
    const coloredLevel = colorize ? `${LEVEL_COLORS[level]}${levelTag}${COLOR_RESET}` : levelTag;
    const pluginTag = `[${pluginName}]`;
    const contextTag = context ? ` [${context}]` : '';
    const resolvedDetails = resolveDetails(details);
    const detailStr = formatDetails(resolvedDetails);
    const line = `${timestamp} ${coloredLevel} ${pluginTag}${contextTag} ${message}${detailStr}`.trimEnd();
    consoleMethod(line);
  };

  const log = (level: LogLevel, context: string, message: string, details?: LogDetails) => {
    write(level, context, message, details);
  };

  const makeLevelLogger = (level: LogLevel) => {
    return (context: string, message: string, details?: LogDetails) => {
      log(level, context, message, details);
    };
  };

  const child = (context: string): ContextLogger => {
    const scopedLog = (level: LogLevel, message: string, details?: LogDetails) => {
      log(level, context, message, details);
    };
    const makeScoped = (level: LogLevel) => {
      return (message: string, details?: LogDetails) => {
        scopedLog(level, message, details);
      };
    };
    return {
      context,
      level: thresholdLevel,
      isLevelEnabled,
      log: scopedLog,
      error: makeScoped('error'),
      warn: makeScoped('warn'),
      info: makeScoped('info'),
      debug: makeScoped('debug'),
      trace: makeScoped('trace'),
    };
  };

  return {
    level: thresholdLevel,
    isLevelEnabled,
    log,
    error: makeLevelLogger('error'),
    warn: makeLevelLogger('warn'),
    info: makeLevelLogger('info'),
    debug: makeLevelLogger('debug'),
    trace: makeLevelLogger('trace'),
    child,
  };
}
