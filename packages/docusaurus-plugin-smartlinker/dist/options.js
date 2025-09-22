import { z } from 'zod';
import { PLUGIN_NAME } from './pluginName.js';
const TrimmedString = z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, {
    message: 'Expected a non-empty string',
});
const TooltipComponentSchema = z.union([
    TrimmedString,
    z.object({
        path: TrimmedString,
        export: TrimmedString.optional(),
    }),
]);
const DebugLevelSchema = z.enum(['error', 'warn', 'info', 'debug', 'trace']);
const DebugOptionsSchema = z
    .object({
    enabled: z.boolean().default(false),
    level: DebugLevelSchema.default('warn'),
})
    .default({ enabled: false, level: 'warn' });
const TooltipComponentsRecord = z
    .record(TooltipComponentSchema)
    .default({})
    .transform((value) => {
    const out = {};
    for (const [alias, spec] of Object.entries(value)) {
        const key = alias.trim();
        if (!key)
            continue;
        if (typeof spec === 'string') {
            out[key] = { importPath: spec };
        }
        else {
            out[key] = {
                importPath: spec.path,
                exportName: spec.export ?? undefined,
            };
        }
    }
    return out;
});
const FolderSchema = z.object({
    path: TrimmedString,
    defaultIcon: TrimmedString.optional(),
    tooltipComponents: TooltipComponentsRecord,
});
export const OptionsSchema = z
    .object({
    icons: z.record(TrimmedString).default({}),
    darkModeIcons: z.record(TrimmedString).optional(),
    iconProps: z.record(z.unknown()).optional(),
    folders: z.array(FolderSchema).default([]),
    debug: DebugOptionsSchema,
})
    .transform((value) => {
    const aggregated = {};
    for (const folder of value.folders) {
        for (const [alias, spec] of Object.entries(folder.tooltipComponents)) {
            if (aggregated[alias])
                continue;
            aggregated[alias] = spec;
        }
    }
    return { ...value, tooltipComponents: aggregated };
});
/**
 * Validate and normalize plugin options without side effects.
 * - Ensures objects exist
 * - Adds structured warnings for common misconfigurations
 */
export function validateOptions(input) {
    const parsed = OptionsSchema.safeParse(input ?? {});
    if (!parsed.success) {
        // Should be rare; Zod already guards shapes.
        return {
            options: {
                icons: {},
                tooltipComponents: {},
                folders: [],
                debug: { enabled: false, level: 'warn' },
            },
            warnings: [{
                    code: 'EMPTY_ICONS_OBJECT',
                    message: 'Invalid options; falling back to empty configuration.',
                    details: { issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) }
                }]
        };
    }
    const options = parsed.data;
    const rawFoldersInput = Array.isArray(input?.folders)
        ? input.folders
        : [];
    const warnings = [];
    // Warn if icons is totally empty (harmless but often unintended)
    if (!options.icons || Object.keys(options.icons).length === 0) {
        warnings.push({
            code: 'EMPTY_ICONS_OBJECT',
            message: '`icons` is empty; links will render without icons unless pages specify one later and a default is set.',
        });
    }
    // Dark-mode overrides should reference existing icon ids
    if (options.darkModeIcons) {
        for (const id of Object.keys(options.darkModeIcons)) {
            if (!options.icons[id]) {
                warnings.push({
                    code: 'DARK_MODE_ICON_UNKNOWN',
                    message: 'darkModeIcons contains an id not present in `icons`.',
                    details: { id }
                });
            }
        }
    }
    // Basic sanity: no empty string ids in icons
    for (const id of Object.keys(options.icons)) {
        if (!id.trim()) {
            warnings.push({
                code: 'ICON_ID_EMPTY',
                message: 'An icon id is an empty string.',
            });
        }
    }
    if (options.folders.length === 0) {
        warnings.push({
            code: 'FOLDERS_REQUIRED',
            message: '`folders` must list at least one directory to scan.',
        });
    }
    const seenFolderPaths = new Map();
    options.folders.forEach((folder, index) => {
        const normalizedPathRaw = folder.path.replace(/\\/g, '/').replace(/\/+$/, '');
        const normalizedPath = normalizedPathRaw || '.';
        const seenCount = seenFolderPaths.get(normalizedPath) ?? 0;
        if (seenCount > 0) {
            warnings.push({
                code: 'FOLDER_PATH_DUPLICATE',
                message: 'Duplicate folder configuration detected.',
                details: { path: normalizedPath },
            });
        }
        seenFolderPaths.set(normalizedPath, seenCount + 1);
        if (folder.defaultIcon && !options.icons[folder.defaultIcon]) {
            warnings.push({
                code: 'FOLDER_DEFAULT_ICON_UNKNOWN',
                message: '`defaultIcon` refers to an unknown icon id.',
                details: { path: normalizedPath, defaultIcon: folder.defaultIcon },
            });
        }
        const rawFolder = rawFoldersInput[index];
        const rawTooltip = rawFolder && typeof rawFolder === 'object'
            ? rawFolder.tooltipComponents
            : undefined;
        if (rawTooltip && typeof rawTooltip === 'object') {
            for (const alias of Object.keys(rawTooltip)) {
                if (!String(alias).trim()) {
                    warnings.push({
                        code: 'FOLDER_TOOLTIP_COMPONENT_ALIAS_EMPTY',
                        message: '`tooltipComponents` contains a component key that is empty.',
                        details: { path: normalizedPath },
                    });
                }
            }
        }
    });
    return { options, warnings };
}
/**
 * Create resolvers bound to normalized options.
 * Pure & stateless: call per need. You can also call resolve* directly with `opts`.
 */
export function createIconResolver(opts) {
    const warnedMissingIds = new Set();
    const warnMissingIcon = (id) => {
        if (warnedMissingIds.has(id)) {
            return;
        }
        warnedMissingIds.add(id);
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn(`[${PLUGIN_NAME}] Requested icon "${id}" is not configured. The link will render without that icon.`);
        }
    };
    function resolveIconId(requestedId, mode = 'light') {
        // Helper to compute path if we have a final id
        const toSrc = (id, modeIn) => {
            const override = modeIn === 'dark' ? opts.darkModeIcons?.[id] : undefined;
            const path = override ?? opts.icons[id];
            return typeof path === 'string' ? path : null;
        };
        if (requestedId) {
            if (opts.icons[requestedId]) {
                const src = toSrc(requestedId, mode);
                return { iconId: requestedId, src };
            }
            warnMissingIcon(requestedId);
        }
        return { iconId: null, src: null };
    }
    function resolveIconSrc(iconId, mode = 'light') {
        const override = mode === 'dark' ? opts.darkModeIcons?.[iconId] : undefined;
        const path = override ?? opts.icons[iconId];
        if (!opts.icons[iconId]) {
            warnMissingIcon(iconId);
        }
        return typeof path === 'string' ? path : null;
    }
    return { resolveIconId, resolveIconSrc, iconProps: opts.iconProps ?? {} };
}
//# sourceMappingURL=options.js.map