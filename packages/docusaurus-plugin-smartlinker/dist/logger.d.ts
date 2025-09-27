import type { DebugOptions } from './options.js';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
type LogDetailRecord = Record<string, unknown>;
type LogDetails = LogDetailRecord | (() => LogDetailRecord | undefined) | undefined;
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
export declare function resolveDebugConfig(base: DebugOptions | undefined, env?: NodeJS.ProcessEnv): DebugResolution;
export declare function createLogger(init: LoggerInit): PluginLogger;
export {};
//# sourceMappingURL=logger.d.ts.map