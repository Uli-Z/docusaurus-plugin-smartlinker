import { describe, it, expect, vi } from 'vitest';
import { validateOptions, createIconResolver } from '../src/options.js';

describe('options validation', () => {
  it('warns on empty icons map and accepts minimal config', () => {
    const { options, warnings } = validateOptions({});
    expect(options.icons).toBeDefined();
    expect(options.tooltipComponents).toBeDefined();
    expect(Array.isArray(warnings)).toBe(true);
    expect(warnings.some(w => w.code === 'EMPTY_ICONS_OBJECT')).toBe(true);
  });

  it('warns if defaultIcon is unknown', () => {
    const { warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      defaultIcon: 'capsule'
    });
    expect(warnings.some(w => w.code === 'DEFAULT_ICON_UNKNOWN')).toBe(true);
  });

  it('warns if darkModeIcons reference unknown ids', () => {
    const { warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      darkModeIcons: { capsule: '/capsule-dark.svg' }
    });
    expect(warnings.some(w => w.code === 'DARK_MODE_ICON_UNKNOWN')).toBe(true);
  });

  it('normalizes tooltipComponents definitions', () => {
    const { options, warnings } = validateOptions({
      icons: { pill: '/pill.svg' },
      tooltipComponents: {
        DrugTip: '@site/src/components/DrugTip',
        Alert: { path: '@site/src/components/Alert', export: 'Alert' },
      },
    });
    expect(warnings.length).toBe(0);
    expect(options.tooltipComponents.DrugTip).toEqual({
      importPath: '@site/src/components/DrugTip',
    });
    expect(options.tooltipComponents.Alert).toEqual({
      importPath: '@site/src/components/Alert',
      exportName: 'Alert',
    });
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
    defaultIcon: 'abx'
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

  it('falls back to defaultIcon when requested is unknown and warns once', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { options } = validateOptions(base);
    const { resolveIconId } = createIconResolver(options);
    const res = resolveIconId('unknown', 'light');
    expect(res.iconId).toBe('abx');
    expect(res.src).toBe('/img/abx.png');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('unknown');

    const second = resolveIconId('unknown', 'dark');
    expect(second.iconId).toBe('abx');
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
    const { options } = validateOptions({ icons: {} });
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
