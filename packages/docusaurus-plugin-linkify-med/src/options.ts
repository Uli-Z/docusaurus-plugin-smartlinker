import { z } from 'zod';

export const OptionsSchema = z.object({
  icons: z.record(z.string()).default({}),
  darkModeIcons: z.record(z.string()).optional(),
  defaultIcon: z.string().optional(),
  iconProps: z.record(z.unknown()).optional(),
});

export type PluginOptions = z.input<typeof OptionsSchema>;
export type NormalizedOptions = z.output<typeof OptionsSchema>;

export type OptionsWarning = {
  code:
    | 'DEFAULT_ICON_UNKNOWN'
    | 'DARK_MODE_ICON_UNKNOWN'
    | 'ICON_ID_EMPTY'
    | 'EMPTY_ICONS_OBJECT';
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
      options: { icons: {} },
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
  function resolveIconId(requestedId?: string, mode: 'light' | 'dark' = 'light'): IconResolution {
    // Helper to compute path if we have a final id
    const toSrc = (id: string, modeIn: 'light' | 'dark'): string | null => {
      const override = modeIn === 'dark' ? opts.darkModeIcons?.[id] : undefined;
      const path = override ?? opts.icons[id];
      return typeof path === 'string' ? path : null;
    };

    // 1) Requested id present?
    if (requestedId && opts.icons[requestedId]) {
      const src = toSrc(requestedId, mode);
      return { iconId: requestedId, src };
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
    return typeof path === 'string' ? path : null;
  }

  return { resolveIconId, resolveIconSrc, iconProps: opts.iconProps ?? {} };
}
