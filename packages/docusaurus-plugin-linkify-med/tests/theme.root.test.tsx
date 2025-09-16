import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Root from '../src/theme/runtime/Root.js';
import SmartLink from '../src/theme/runtime/SmartLink.js';
import LinkifyShortNote from '../src/theme/runtime/LinkifyShortNote.js';
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

vi.mock('@generated/docusaurus-plugin-linkify-med/default/registry', () => ({
  registry: {
    amoxicillin: {
      id: 'amoxicillin',
      slug: '/docs/amoxicillin',
      icon: 'pill',
      ShortNote: () => <div data-testid="shortnote">Short note!</div>,
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
    expect(notes[0]).toHaveTextContent('Short note!');
  });

  it('exposes LinkifyShortNote through the MDX provider', () => {
    render(
      <Root>
        <LinkifyShortNote tipKey="amoxicillin" />
      </Root>
    );

    const note = screen.getByTestId('shortnote');
    expect(note).toHaveTextContent('Short note!');
  });
});
