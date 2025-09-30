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

export type { DebugOptions as D, NormalizedOptions as N, PluginOptions as P };
