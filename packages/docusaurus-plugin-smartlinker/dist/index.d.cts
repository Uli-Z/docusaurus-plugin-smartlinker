import { LoadContext, Plugin } from '@docusaurus/types';
import { D as DebugOptions, P as PluginOptions, N as NormalizedOptions } from './options-DZxWH42N.cjs';
import 'zod';

interface IndexRawEntry {
    id: string;
    slug: string;
    terms: string[];
    linkify: boolean;
    icon?: string;
    shortNote?: string;
    /** Source file path (for proximity resolution, warnings later) */
    sourcePath: string;
    /** Identifier of the configured folder that produced this entry. */
    folderId?: string;
    /** Derived docs plugin identifier (relative path without extension). */
    docId?: string;
}

/**
 * Result of emitting an ESM module for a given shortNote.
 */
interface NoteModule {
    filename: string;
    contents: string;
}

interface RegistryModule {
    filename: string;
    contents: string;
}

interface FsIndexProviderOptions {
    roots: string[];
}
interface TargetInfo {
    id: string;
    slug: string;
    icon?: string;
    sourcePath: string;
    terms: string[];
    folderId?: string | null;
}
interface IndexProvider {
    getAllTargets(): TargetInfo[];
    getCurrentFilePath(file: {
        path?: string;
    }): string;
}
/**
 * Create a docusaurus-plugin-smartlinker/remark IndexProvider by scanning the file system
 * for MD/MDX files and parsing their frontmatter.
 */
declare function createFsIndexProvider(opts: FsIndexProviderOptions): IndexProvider;

declare const PLUGIN_NAME = "docusaurus-plugin-smartlinker";

declare function getIndexProvider(): IndexProvider | undefined;

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
type LogDetailRecord = Record<string, unknown>;
type LogDetails = LogDetailRecord | (() => LogDetailRecord | undefined) | undefined;
interface LoggerInit {
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
interface PluginLogger {
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
interface ContextLogger {
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
interface DebugResolution {
    config: DebugOptions;
    source: 'config' | 'env';
    appliedOverrides: {
        enabled?: boolean;
        level?: LogLevel;
    };
    invalidLevel?: string;
}
declare function resolveDebugConfig(base: DebugOptions | undefined, env?: NodeJS.ProcessEnv): DebugResolution;
declare function createLogger(init: LoggerInit): PluginLogger;

declare function setDebugConfig(config: DebugOptions | undefined): void;
declare function getDebugConfig(): DebugOptions | undefined;

type Content = {
    entries: IndexRawEntry[];
    notes: NoteModule[];
    registry: RegistryModule;
    opts: NormalizedOptions;
};
declare function smartlinkerPlugin(_context: LoadContext, optsIn?: PluginOptions): Plugin<Content>;

export { DebugOptions, type FsIndexProviderOptions, type IndexProvider, type LogLevel, PLUGIN_NAME, PluginOptions, type TargetInfo, createFsIndexProvider, createLogger, smartlinkerPlugin as default, getDebugConfig, getIndexProvider, resolveDebugConfig, setDebugConfig };
