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

export type TooltipComponentConfig = {
  importPath: string;
  exportName?: string;
};

export const OptionsSchema = z.object({
  icons: z.record(TrimmedString).default({}),
  darkModeIcons: z.record(TrimmedString).optional(),
  defaultIcon: TrimmedString.optional(),
  iconProps: z.record(z.unknown()).optional(),
  tooltipComponents: z
    .record(TooltipComponentSchema)
    .default({})
    .transform((value) => {
      const out: Record<string, TooltipComponentConfig> = {};
      for (const [alias, spec] of Object.entries(value)) {
        if (typeof spec === 'string') {
          out[alias] = { importPath: spec };
        } else {
          out[alias] = {
            importPath: spec.path,
            exportName: spec.export ?? undefined,
          };
        }
      }
      return out;
    }),
});

export type PluginOptions = z.input<typeof OptionsSchema>;
export type NormalizedOptions = z.output<typeof OptionsSchema>;

export type OptionsWarning = {
  code:
    | 'DEFAULT_ICON_UNKNOWN'
    | 'DARK_MODE_ICON_UNKNOWN'
    | 'ICON_ID_EMPTY'
    | 'EMPTY_ICONS_OBJECT'
    | 'TOOLTIP_COMPONENT_ALIAS_EMPTY';
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
      options: { icons: {}, tooltipComponents: {} },
      warnings: [{
        code: 'EMPTY_ICONS_OBJECT',
        message: 'Invalid options; falling back to empty configuration.',
        details: { issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) }
      }]
    };
  }

  const options = parsed.data;
  const warnings: OptionsWarning[] = [];

  // Warn if icons is totally empty (harmless but often unintended)
  if (!options.icons || Object.keys(options.icons).length === 0) {
    warnings.push({
      code: 'EMPTY_ICONS_OBJECT',
      message: '`icons` is empty; links will render without icons unless pages specify one later and a default is set.',
    });
  }

  // Default icon must exist in icons map
  if (options.defaultIcon && !options.icons[options.defaultIcon]) {
    warnings.push({
      code: 'DEFAULT_ICON_UNKNOWN',
      message: '`defaultIcon` refers to an unknown icon id.',
      details: { defaultIcon: options.defaultIcon }
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

  for (const alias of Object.keys(options.tooltipComponents)) {
    if (!alias.trim()) {
      warnings.push({
        code: 'TOOLTIP_COMPONENT_ALIAS_EMPTY',
        message: '`tooltipComponents` contains a component key that is empty.',
      });
    }
  }

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
        `[${PLUGIN_NAME}] Requested icon "${id}" is not configured. The link will render without that icon unless a default applies.`,
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

    // 1) Requested id present?
    if (requestedId) {
      if (opts.icons[requestedId]) {
        const src = toSrc(requestedId, mode);
        return { iconId: requestedId, src };
      }
      warnMissingIcon(requestedId);
    }

    // 2) Fallback to defaultIcon if valid
    if (opts.defaultIcon && opts.icons[opts.defaultIcon]) {
      const src = toSrc(opts.defaultIcon, mode);
      return { iconId: opts.defaultIcon, src };
    }

    // 3) Nothing applies
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
