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

export type TooltipComponentConfig = {
  importPath: string;
  exportName?: string;
};

const TooltipComponentsRecord = z
  .record(TooltipComponentSchema)
  .default({})
  .transform((value) => {
    const out: Record<string, TooltipComponentConfig> = {};
    for (const [alias, spec] of Object.entries(value)) {
      const key = alias.trim();
      if (!key) continue;
      if (typeof spec === 'string') {
        out[key] = { importPath: spec };
      } else {
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
    const aggregated: Record<string, TooltipComponentConfig> = {};
    for (const folder of value.folders) {
      for (const [alias, spec] of Object.entries(folder.tooltipComponents)) {
        if (aggregated[alias]) continue;
        aggregated[alias] = spec;
      }
    }
    return { ...value, tooltipComponents: aggregated };
  });

export type PluginOptions = z.input<typeof OptionsSchema>;
export type NormalizedFolderOption = z.output<typeof FolderSchema>;
export type NormalizedOptions = z.output<typeof OptionsSchema>;
export type DebugOptions = z.output<typeof DebugOptionsSchema>;

export type OptionsWarning = {
  code:
    | 'FOLDERS_REQUIRED'
    | 'FOLDER_PATH_DUPLICATE'
    | 'FOLDER_DEFAULT_ICON_UNKNOWN'
    | 'FOLDER_TOOLTIP_COMPONENT_ALIAS_EMPTY'
    | 'DARK_MODE_ICON_UNKNOWN'
    | 'ICON_ID_EMPTY'
    | 'EMPTY_ICONS_OBJECT'
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
export function validateOptions(input: PluginOptions | undefined): ValidationResult {
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
  const rawFoldersInput: unknown[] = Array.isArray((input as any)?.folders)
    ? (input as any).folders
    : [];
  const warnings: OptionsWarning[] = [];

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

  const seenFolderPaths = new Map<string, number>();
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
      ? (rawFolder as any).tooltipComponents
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
export function createIconResolver(opts: NormalizedOptions) {
  const warnedMissingIds = new Set<string>();

  const warnMissingIcon = (id: string) => {
    if (warnedMissingIds.has(id)) {
      return;
    }
    warnedMissingIds.add(id);
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        `[${PLUGIN_NAME}] Requested icon "${id}" is not configured. The link will render without that icon.`,
      );
    }
  };

  function resolveIconId(requestedId?: string, mode: 'light' | 'dark' = 'light'): IconResolution {
    // Helper to compute path if we have a final id
    const toSrc = (id: string, modeIn: 'light' | 'dark'): string | null => {
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

  function resolveIconSrc(iconId: string, mode: 'light' | 'dark' = 'light'): string | null {
    const override = mode === 'dark' ? opts.darkModeIcons?.[iconId] : undefined;
    const path = override ?? opts.icons[iconId];
    if (!opts.icons[iconId]) {
      warnMissingIcon(iconId);
    }
    return typeof path === 'string' ? path : null;
  }

  return { resolveIconId, resolveIconSrc, iconProps: opts.iconProps ?? {} };
}
