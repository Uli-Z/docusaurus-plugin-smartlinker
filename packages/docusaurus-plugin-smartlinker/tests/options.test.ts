import { describe, it, expect, vi } from 'vitest';
import { validateOptions, createIconResolver } from '../src/options.js';

describe('options validation', () => {
  it('warns on empty icons map and accepts minimal config', () => {
    const { options, warnings } = validateOptions({});
    expect(options.icons).toBeDefined();
    expect(options.tooltipComponents).toBeDefined();
    expect(options.folders).toBeDefined();
    expect(options.debug).toEqual({ enabled: false, level: 'warn' });
    expect(Array.isArray(warnings)).toBe(true);
    expect(warnings.some(w => w.code === 'EMPTY_ICONS_OBJECT')).toBe(true);
    expect(warnings.some(w => w.code === 'FOLDERS_REQUIRED')).toBe(true);
  });

  it('accepts explicit debug configuration', () => {
    const { options } = validateOptions({
      debug: { enabled: true, level: 'trace' },
    });
    expect(options.debug).toEqual({ enabled: true, level: 'trace' });
  });

  it('warns if a folder defaultIcon is unknown', () => {
    const { warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      folders: [
        { path: 'docs', defaultIcon: 'capsule' }
      ]
    });
    expect(warnings.some(w => w.code === 'FOLDER_DEFAULT_ICON_UNKNOWN')).toBe(true);
  });

  it('warns if darkModeIcons reference unknown ids', () => {
    const { warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      darkModeIcons: { capsule: '/capsule-dark.svg' },
      folders: [{ path: 'docs' }]
    });
    expect(warnings.some(w => w.code === 'DARK_MODE_ICON_UNKNOWN')).toBe(true);
  });

  it('normalizes tooltipComponents definitions', () => {
    const { options, warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      folders: [
        {
          path: 'docs',
          tooltipComponents: {
            DrugTip: '@site/src/components/DrugTip',
          },
        },
        {
          path: 'guides',
          tooltipComponents: {
            Alert: { path: '@site/src/components/Alert', export: 'Alert' },
          },
        },
      ],
    });
    expect(warnings.length).toBe(0);
    expect(options.folders[0].tooltipComponents.DrugTip).toEqual({
      importPath: '@site/src/components/DrugTip',
    });
    expect(options.tooltipComponents.DrugTip).toEqual({
      importPath: '@site/src/components/DrugTip',
    });
    expect(options.folders[1].tooltipComponents.Alert).toEqual({
      importPath: '@site/src/components/Alert',
      exportName: 'Alert',
    });
    expect(options.tooltipComponents.Alert).toEqual({
      importPath: '@site/src/components/Alert',
      exportName: 'Alert',
    });
  });

  it('warns when folders are duplicated', () => {
    const { warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      folders: [{ path: 'docs' }, { path: 'docs/' }]
    });
    expect(warnings.some(w => w.code === 'FOLDER_PATH_DUPLICATE')).toBe(true);
  });

  it('warns when a folder tooltip alias is empty', () => {
    const { warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      folders: [{
        path: 'docs',
        tooltipComponents: {
          ' ': '@site/src/components/DrugTip',
        },
      }],
    });
    expect(warnings.some(w => w.code === 'FOLDER_TOOLTIP_COMPONENT_ALIAS_EMPTY')).toBe(true);
  });
});

describe('icon resolver', () => {
  const base = {
    icons: {
      pill: '/img/pill.svg',
      abx: '/img/abx.png'
    },
    darkModeIcons: {
      pill: '/img/pill-dark.svg'
    },
    folders: [{ path: 'docs' }]
  };

  it('returns requested id when known (light)', () => {
    const { options } = validateOptions(base);
    const { resolveIconId } = createIconResolver(options);
    const res = resolveIconId('pill', 'light');
    expect(res.iconId).toBe('pill');
    expect(res.src).toBe('/img/pill.svg');
  });

  it('applies dark-mode override when available', () => {
    const { options } = validateOptions(base);
    const { resolveIconId } = createIconResolver(options);
    const res = resolveIconId('pill', 'dark');
    expect(res.iconId).toBe('pill');
    expect(res.src).toBe('/img/pill-dark.svg');
  });

  it('returns null when requested icon is unknown and warns once', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { options } = validateOptions(base);
    const { resolveIconId } = createIconResolver(options);
    const res = resolveIconId('unknown', 'light');
    expect(res.iconId).toBeNull();
    expect(res.src).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('unknown');

    const second = resolveIconId('unknown', 'dark');
    expect(second.iconId).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('warns when resolving icon src for an unknown id', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { options } = validateOptions(base);
    const { resolveIconSrc } = createIconResolver(options);
    const src = resolveIconSrc('does-not-exist', 'light');
    expect(src).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('does-not-exist');
    warnSpy.mockRestore();
  });

  it('returns null when neither requested nor default are applicable', () => {
    const { options } = validateOptions({ icons: {}, folders: [{ path: 'docs' }] });
    const { resolveIconId } = createIconResolver(options);
    const res = resolveIconId(undefined, 'light');
    expect(res.iconId).toBeNull();
    expect(res.src).toBeNull();
  });

  it('supports emoji icon strings', () => {
    const { options } = validateOptions({ icons: { pill: 'emoji:💊' } });
    const { resolveIconId } = createIconResolver(options);
    const res = resolveIconId('pill', 'light');
    expect(res.iconId).toBe('pill');
    expect(res.src).toBe('emoji:💊');
  });
});
