import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Root from '../src/theme/runtime/Root.js';
import SmartLink from '../src/theme/runtime/SmartLink.js';
import { PLUGIN_NAME } from '../src/pluginName.js';

vi.mock('@theme-init/Root', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const usePluginDataMock = vi.fn();
vi.mock('@docusaurus/useGlobalData', () => ({
  __esModule: true,
  usePluginData: (name: string) => usePluginDataMock(name),
}));

vi.mock('@generated/docusaurus-plugin-linkify-med/default/tooltipComponents', () => ({
  tooltipComponents: {
    DrugTip: ({ note }: { note: string }) => (
      <div data-testid="drug-tip">{note}</div>
    ),
  },
}));

vi.mock('@generated/docusaurus-plugin-linkify-med/default/registry', () => ({
  registry: {
    amoxicillin: {
      id: 'amoxicillin',
      slug: '/docs/amoxicillin',
      icon: 'pill',
      ShortNote: ({ components }: { components?: Record<string, React.ComponentType<any>> }) => {
        const Tip = components?.DrugTip ?? (() => null);
        return (
          <div data-testid="shortnote">
            <Tip note="From provider" />
          </div>
        );
      },
    },
  },
}));

describe('theme Root provider', () => {
  beforeEach(() => {
    usePluginDataMock.mockClear();
    usePluginDataMock.mockReturnValue({
      options: { icons: { pill: 'emoji:💊' } },
      entries: [{ id: 'amoxicillin', slug: '/docs/amoxicillin', icon: 'pill' }],
    });
  });

  it('hydrates SmartLink with registry + icon contexts from plugin data', async () => {
    render(
      <Root>
        <SmartLink to="/docs/amoxicillin" tipKey="amoxicillin" icon="pill">
          Amoxi
        </SmartLink>
      </Root>
    );

    expect(usePluginDataMock).toHaveBeenCalledWith(PLUGIN_NAME);

    const link = screen.getByRole('link', { name: /Amoxi/ });
    expect(link).toHaveAttribute('href', '/docs/amoxicillin');
    expect(link).toHaveAttribute('data-tipkey', 'amoxicillin');

    const emoji = screen.getByText('💊');
    expect(emoji).toHaveClass('lm-icon-emoji');

    await userEvent.hover(link);
    const notes = await screen.findAllByTestId('shortnote');
    expect(notes.length).toBeGreaterThan(0);
    const custom = await screen.findAllByTestId('drug-tip');
    expect(custom[0]).toHaveTextContent('From provider');
  });
});
