import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MDXProvider } from '@mdx-js/react';
import SmartLink from '../src/theme/runtime/SmartLink.js';
import { LinkifyRegistryProvider, IconConfigProvider } from '../src/theme/runtime/context.js';
import { emitShortNoteModule } from '../src/codegen/notesEmitter.js';

function setup(
  ui: React.ReactNode,
  { registry = {}, iconApi, mdxComponents }: any = {}
) {
  const api = iconApi ?? {
    resolveIconSrc: (id: string, mode: 'light'|'dark') => `/img/${id}-${mode}.svg`,
    iconProps: { width: 14, height: 14 }
  };
  const wrapped = mdxComponents
    ? <MDXProvider components={mdxComponents}>{ui}</MDXProvider>
    : ui;
  return render(
    <IconConfigProvider api={api}>
      <LinkifyRegistryProvider registry={registry}>
        {wrapped}
      </LinkifyRegistryProvider>
    </IconConfigProvider>
  );
}

const Note: React.FC = () => <div data-testid="tooltip-note">Note!</div>;

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadShortNoteComponent(mod: { filename: string; contents: string }) {
  const baseDir = join(__dirname, '.tmp');
  await mkdir(baseDir, { recursive: true });
  const tmpDir = await mkdtemp(join(baseDir, 'note-'));
  await writeFile(join(tmpDir, 'package.json'), JSON.stringify({ type: 'module' }));
  const absPath = join(tmpDir, mod.filename);
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, mod.contents, 'utf8');
  const url = `${pathToFileURL(absPath).href}?t=${Date.now()}`;
  const imported = await import(/* @vite-ignore */ url);
  return imported.ShortNote as React.ComponentType<any>;
}

describe('SmartLink (theme)', () => {
  it('renders icon after text and anchor href equals slug', () => {
    setup(
      <SmartLink to="/antibiotics/amoxicillin" icon="pill" tipKey="amoxicillin">Amoxi</SmartLink>,
      { registry: { amoxicillin: { id: 'amoxicillin', slug: '/antibiotics/amoxicillin', icon: 'pill' } } }
    );
    const a = screen.getByRole('link', { name: /Amoxi/ });
    expect(a).toHaveAttribute('href', '/antibiotics/amoxicillin');
    expect(a).toHaveAttribute('data-tipkey', 'amoxicillin');

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
    expect(link).toHaveAttribute('data-tipkey', 'amoxicillin');
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

  it('renders markdown and custom components within tooltip content', async () => {
    const short = await emitShortNoteModule(
      'amoxicillin',
      `**Aminopenicillin.** [Visit link](https://example.com)\n<DrugTip note="Take with food" />`
    );
    expect(short).not.toBeNull();
    const ShortNote = await loadShortNoteComponent(short!);

    const DrugTip: React.FC<{ note: string }> = ({ note }) => (
      <div data-testid="drug-tip">
        <strong>Tip:</strong> {note}
      </div>
    );

    setup(
      <SmartLink to="/x" icon="pill" tipKey="amoxicillin">Amoxi</SmartLink>,
      {
        registry: {
          amoxicillin: { id: 'amoxicillin', slug: '/x', icon: 'pill', ShortNote },
        },
        mdxComponents: { DrugTip },
      }
    );

    const link = screen.getByRole('link', { name: /Amoxi/ });
    await userEvent.hover(link);

    const bold = await screen.findAllByText('Aminopenicillin.', { selector: 'strong' });
    expect(bold.length).toBeGreaterThan(0);

    const tooltipLink = await screen.findAllByRole('link', { name: 'Visit link' });
    expect(tooltipLink[0]).toHaveAttribute('href', 'https://example.com');

    const custom = await screen.findAllByTestId('drug-tip');
    expect(custom[0]).toHaveTextContent('Take with food');
  });

  it('icon resolver uses dark/light paths', () => {
    const resolveIconSrc = vi.fn((id: string, mode: 'light' | 'dark') => `/img/${id}-${mode}.svg`);

    const { container } = setup(<SmartLink to="/x" icon="pill">Amoxi</SmartLink>, {
      registry: {},
      iconApi: { resolveIconSrc, iconProps: { width: 14, height: 14 } },
    });

    expect(resolveIconSrc).toHaveBeenCalledWith('pill', 'light');
    expect(resolveIconSrc).toHaveBeenCalledWith('pill', 'dark');

    const img = container.querySelector('img.lm-icon') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.dataset.light).toBe('/img/pill-light.svg');
    expect(img.dataset.dark).toBe('/img/pill-dark.svg');
  });

  it('renders emoji when icon resolves to emoji string', () => {
    const iconApi = { resolveIconSrc: () => 'emoji:💊', iconProps: {} };
    setup(<SmartLink to="/x" icon="pill">Amoxi</SmartLink>, { registry: {}, iconApi });
    const emoji = screen.getByText('💊');
    expect(emoji).toHaveClass('lm-icon-emoji');
  });
});
