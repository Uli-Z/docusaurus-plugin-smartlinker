import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SmartLink from '../src/theme/SmartLink';
import { LinkifyRegistryProvider, IconConfigProvider } from '../src/theme/context';

function setup(ui: React.ReactNode, { registry = {}, iconApi } = {} as any) {
  const api = iconApi ?? {
    resolveIconSrc: (id: string, mode: 'light'|'dark') => `/img/${id}-${mode}.svg`,
    iconProps: { width: 14, height: 14 }
  };
  return render(
    <IconConfigProvider api={api}>
      <LinkifyRegistryProvider registry={registry}>
        {ui}
      </LinkifyRegistryProvider>
    </IconConfigProvider>
  );
}

const Note: React.FC = () => <div data-testid="tooltip-note">Note!</div>;

describe('SmartLink (theme)', () => {
  it('renders icon after text and anchor href equals slug', () => {
    setup(
      <SmartLink to="/antibiotics/amoxicillin" icon="pill" tipKey="amoxicillin">Amoxi</SmartLink>,
      { registry: { amoxicillin: { id: 'amoxicillin', slug: '/antibiotics/amoxicillin', icon: 'pill' } } }
    );
    const a = screen.getByRole('link', { name: /Amoxi/ });
    expect(a).toHaveAttribute('href', '/antibiotics/amoxicillin');

    // The icon img should be present and logically after text in DOM order
    const text = screen.getByText('Amoxi');
    const imgs = a.querySelectorAll('img');
    expect(imgs.length).toBe(1);
    // ensure the icon node comes after the text in the anchor's children
    const order = Array.from(a.childNodes);
    expect(order.indexOf(text.parentElement!)).toBeLessThan(order.indexOf(imgs[0].parentElement!.parentElement!));
  });

  it('desktop hover shows tooltip content when ShortNote exists', async () => {
    setup(
      <SmartLink to="/x" icon="pill" tipKey="amoxicillin">Amoxi</SmartLink>,
      { registry: { amoxicillin: { id: 'amoxicillin', slug: '/x', icon: 'pill', ShortNote: Note } } }
    );
    const link = screen.getByRole('link', { name: /Amoxi/ });
    // hover
    await userEvent.hover(link);
    // content should appear (Radix may render multiple nodes)
    const tips = await screen.findAllByTestId('tooltip-note');
    expect(tips.length).toBeGreaterThan(0);
  });

  it('mobile icon tap toggles tooltip; text tap navigates (we only assert no preventDefault)', async () => {
    // Force non-hover environment by mocking matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, addEventListener() {}, removeEventListener() {}, onchange: null, addListener() {}, removeListener() {}
      })
    });

    setup(
      <SmartLink to="/x" icon="pill" tipKey="amoxicillin">Amoxi</SmartLink>,
      { registry: { amoxicillin: { id: 'amoxicillin', slug: '/x', icon: 'pill', ShortNote: Note } } }
    );

    const link = screen.getByRole('link', { name: /Amoxi/ });
    const icon = link.querySelector('.lm-smartlink__icon') as HTMLElement;

    // Tap icon: tooltip shows
    await userEvent.click(icon);
    const tips = await screen.findAllByTestId('tooltip-note');
    expect(tips.length).toBeGreaterThan(0);

    // Tap text: click the anchor (should close tooltip on blur/click)
    await userEvent.click(link);
    // we cannot assert navigation in jsdom; just ensure still defined
    expect(link).toHaveAttribute('href', '/x');
  });

  it('does not render tooltip if no ShortNote in registry', async () => {
    setup(<SmartLink to="/x" icon="pill" tipKey="amoxicillin">Amoxi</SmartLink>, {
      registry: { amoxicillin: { id: 'amoxicillin', slug: '/x', icon: 'pill' } }
    });
    const link = screen.getByRole('link', { name: /Amoxi/ });
    await userEvent.hover(link);
    // there should be no tooltip content rendered
    const tip = screen.queryByTestId('tooltip-note');
    expect(tip).toBeNull();
  });

  it('icon resolver uses dark/light paths', () => {
    // pretend dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-color-scheme: dark'),
        media: query, addEventListener() {}, removeEventListener() {}, onchange: null, addListener() {}, removeListener() {}
      })
    });

    setup(<SmartLink to="/x" icon="pill">Amoxi</SmartLink>, {
      registry: {}
    });
    const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
    expect(img.src).toMatch('/img/pill-dark.svg');
  });
});
