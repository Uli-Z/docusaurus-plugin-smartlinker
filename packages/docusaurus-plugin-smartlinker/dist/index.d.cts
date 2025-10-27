import { LoadContext, Plugin } from '@docusaurus/types';
import { z } from 'zod';

declare const DebugOptionsSchema: z.ZodDefault<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    level: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug", "trace"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    level: "error" | "warn" | "info" | "debug" | "trace";
}, {
    enabled?: boolean | undefined;
    level?: "error" | "warn" | "info" | "debug" | "trace" | undefined;
}>>;
type TooltipComponentConfig = {
    importPath: string;
    exportName?: string;
};
declare const OptionsSchema: z.ZodEffects<z.ZodObject<{
    icons: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    darkModeIcons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    iconProps: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    folders: z.ZodDefault<z.ZodArray<z.ZodObject<{
        path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        defaultIcon: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
        tooltipComponents: z.ZodEffects<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, z.ZodObject<{
            path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
            export: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            export?: string | undefined;
        }, {
            path: string;
            export?: string | undefined;
        }>]>>>, Record<string, TooltipComponentConfig>, Record<string, string | {
            path: string;
            export?: string | undefined;
        }> | undefined>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        tooltipComponents: Record<string, TooltipComponentConfig>;
        defaultIcon?: string | undefined;
    }, {
        path: string;
        defaultIcon?: string | undefined;
        tooltipComponents?: Record<string, string | {
            path: string;
            export?: string | undefined;
        }> | undefined;
    }>, "many">>;
    debug: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        level: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug", "trace"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        level: "error" | "warn" | "info" | "debug" | "trace";
    }, {
        enabled?: boolean | undefined;
        level?: "error" | "warn" | "info" | "debug" | "trace" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    icons: Record<string, string>;
    folders: {
        path: string;
        tooltipComponents: Record<string, TooltipComponentConfig>;
        defaultIcon?: string | undefined;
    }[];
    debug: {
        enabled: boolean;
        level: "error" | "warn" | "info" | "debug" | "trace";
    };
    darkModeIcons?: Record<string, string> | undefined;
    iconProps?: Record<string, unknown> | undefined;
}, {
    icons?: Record<string, string> | undefined;
    darkModeIcons?: Record<string, string> | undefined;
    iconProps?: Record<string, unknown> | undefined;
    folders?: {
        path: string;
        defaultIcon?: string | undefined;
        tooltipComponents?: Record<string, string | {
            path: string;
            export?: string | undefined;
        }> | undefined;
    }[] | undefined;
    debug?: {
        enabled?: boolean | undefined;
        level?: "error" | "warn" | "info" | "debug" | "trace" | undefined;
    } | undefined;
}>, {
    tooltipComponents: Record<string, TooltipComponentConfig>;
    icons: Record<string, string>;
    folders: {
        path: string;
        tooltipComponents: Record<string, TooltipComponentConfig>;
        defaultIcon?: string | undefined;
    }[];
    debug: {
        enabled: boolean;
        level: "error" | "warn" | "info" | "debug" | "trace";
    };
    darkModeIcons?: Record<string, string> | undefined;
    iconProps?: Record<string, unknown> | undefined;
}, {
    icons?: Record<string, string> | undefined;
    darkModeIcons?: Record<string, string> | undefined;
    iconProps?: Record<string, unknown> | undefined;
    folders?: {
        path: string;
        defaultIcon?: string | undefined;
        tooltipComponents?: Record<string, string | {
            path: string;
            export?: string | undefined;
        }> | undefined;
    }[] | undefined;
    debug?: {
        enabled?: boolean | undefined;
        level?: "error" | "warn" | "info" | "debug" | "trace" | undefined;
    } | undefined;
}>;
type PluginOptions = z.input<typeof OptionsSchema>;
type NormalizedOptions = z.output<typeof OptionsSchema>;
type DebugOptions = z.output<typeof DebugOptionsSchema>;

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

declare function recordTermProcessingMs(durationMs: number): void;
declare function getTermProcessingMs(): number;
declare function consumeTermProcessingMs(): number;
declare function resetTermProcessingMs(): void;
declare function recordIndexBuildMs(durationMs: number): void;
declare function getIndexBuildMs(): number;
declare function consumeIndexBuildMs(): number;
declare function resetIndexBuildMs(): void;
declare function resetMetrics(): void;

declare function updateDocTermUsage(docPath: string | null | undefined, termIds: Iterable<string>): void;
declare function removeDocTermUsage(docPath: string | null | undefined): void;
declare function resetTermUsage(): void;

type Content = {
    entries: IndexRawEntry[];
    notes: NoteModule[];
    registry: RegistryModule;
    opts: NormalizedOptions;
};
declare function smartlinkerPlugin(_context: LoadContext, optsIn?: PluginOptions): Plugin<Content>;

export { type DebugOptions, type FsIndexProviderOptions, type IndexProvider, type LogLevel, PLUGIN_NAME, type PluginOptions, type TargetInfo, consumeIndexBuildMs, consumeTermProcessingMs, createFsIndexProvider, createLogger, smartlinkerPlugin as default, getDebugConfig, getIndexBuildMs, getIndexProvider, getTermProcessingMs, recordIndexBuildMs, recordTermProcessingMs, removeDocTermUsage, resetIndexBuildMs, resetMetrics, resetTermProcessingMs, resetTermUsage, resolveDebugConfig, setDebugConfig, updateDocTermUsage };
