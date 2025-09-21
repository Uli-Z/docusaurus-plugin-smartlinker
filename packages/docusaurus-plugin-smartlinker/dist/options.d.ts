import { z } from 'zod';
export type TooltipComponentConfig = {
    importPath: string;
    exportName?: string;
};
declare const FolderSchema: z.ZodObject<{
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
}>;
export declare const OptionsSchema: z.ZodEffects<z.ZodObject<{
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
}, "strip", z.ZodTypeAny, {
    icons: Record<string, string>;
    folders: {
        path: string;
        tooltipComponents: Record<string, TooltipComponentConfig>;
        defaultIcon?: string | undefined;
    }[];
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
}>, {
    tooltipComponents: Record<string, TooltipComponentConfig>;
    icons: Record<string, string>;
    folders: {
        path: string;
        tooltipComponents: Record<string, TooltipComponentConfig>;
        defaultIcon?: string | undefined;
    }[];
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
}>;
export type PluginOptions = z.input<typeof OptionsSchema>;
export type NormalizedFolderOption = z.output<typeof FolderSchema>;
export type NormalizedOptions = z.output<typeof OptionsSchema>;
export type OptionsWarning = {
    code: 'FOLDERS_REQUIRED' | 'FOLDER_PATH_DUPLICATE' | 'FOLDER_DEFAULT_ICON_UNKNOWN' | 'FOLDER_TOOLTIP_COMPONENT_ALIAS_EMPTY' | 'DARK_MODE_ICON_UNKNOWN' | 'ICON_ID_EMPTY' | 'EMPTY_ICONS_OBJECT';
    message: string;
    details?: Record<string, unknown>;
};
export type ValidationResult = {
    options: NormalizedOptions;
    warnings: OptionsWarning[];
};
/**
 * Validate and normalize plugin options without side effects.
 * - Ensures objects exist
 * - Adds structured warnings for common misconfigurations
 */
export declare function validateOptions(input: PluginOptions | undefined): ValidationResult;
export type IconResolution = {
    /** the chosen icon id (logical id), or null if none is applicable */
    iconId: string | null;
    /** returns the concrete asset path for the chosen id & mode */
    src: string | null;
};
/**
 * Create resolvers bound to normalized options.
 * Pure & stateless: call per need. You can also call resolve* directly with `opts`.
 */
export declare function createIconResolver(opts: NormalizedOptions): {
    resolveIconId: (requestedId?: string, mode?: "light" | "dark") => IconResolution;
    resolveIconSrc: (iconId: string, mode?: "light" | "dark") => string | null;
    iconProps: Record<string, unknown>;
};
export {};
//# sourceMappingURL=options.d.ts.map