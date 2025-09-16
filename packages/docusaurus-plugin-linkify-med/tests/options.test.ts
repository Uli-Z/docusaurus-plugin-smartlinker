import { describe, it, expect } from 'vitest';
import { validateOptions, createIconResolver } from '../src/options.js';

describe('options validation', () => {
  it('warns on empty icons map and accepts minimal config', () => {
    const { options, warnings } = validateOptions({});
    expect(options.icons).toBeDefined();
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

  it('falls back to defaultIcon when requested is unknown', () => {
    const { options } = validateOptions(base);
    const { resolveIconId } = createIconResolver(options);
    const res = resolveIconId('unknown', 'light');
    expect(res.iconId).toBe('abx');
    expect(res.src).toBe('/img/abx.png');
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
