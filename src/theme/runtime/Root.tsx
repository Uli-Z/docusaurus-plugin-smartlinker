import React from 'react';
import Root from '@theme-init/Root';
import { usePluginData } from '@docusaurus/useGlobalData';
import { MDXProvider, useMDXComponents } from '@mdx-js/react';
import { IconConfigProvider, LinkifyRegistryProvider, type LinkifyRegistry } from './context.js';
import SmartLink from './SmartLink.js';
import LinkifyShortNote from './LinkifyShortNote.js';
import { createIconResolver, type NormalizedOptions } from '../../options.js';
import { PLUGIN_NAME } from '../../pluginName.js';
import { generatedRegistry, type GeneratedRegistryEntry } from './generatedRegistry.js';
import { tooltipComponents } from './generatedTooltipComponents.js';

const pluginName = PLUGIN_NAME;
const EMPTY_OPTIONS: NormalizedOptions = { icons: {}, tooltipComponents: {} };

type PluginData = {
  options: NormalizedOptions;
  entries: Array<{ id: string; slug: string; icon?: string | null }>;
};

function Providers({ children }: { children: React.ReactNode }) {
  const data = usePluginData<PluginData | null>(pluginName) ?? null;
  const normalizedOptions = data?.options ?? EMPTY_OPTIONS;
  const iconApi = React.useMemo(() => createIconResolver(normalizedOptions), [normalizedOptions]);
  const existingComponents = useMDXComponents();
  const mdxComponents = React.useMemo<Record<string, React.ComponentType<any>>>(
    () => ({
      ...existingComponents,
      ...tooltipComponents,
      SmartLink,
      LinkifyShortNote,
    }),
    [existingComponents],
  );

  const registryValue = React.useMemo<LinkifyRegistry>(() => {
    const entries = data?.entries ?? [];
    const next: LinkifyRegistry = {};
    for (const entry of entries) {
      const generated = generatedRegistry[entry.id] as GeneratedRegistryEntry | undefined;
      next[entry.id] = {
        id: entry.id,
        slug: entry.slug,
        icon: entry.icon ?? generated?.icon,
        ShortNote: generated?.ShortNote,
      };
    }
    return next;
  }, [data]);

  return (
    <IconConfigProvider api={iconApi}>
      <LinkifyRegistryProvider registry={registryValue}>
        <MDXProvider components={mdxComponents}>
          {children}
        </MDXProvider>
      </LinkifyRegistryProvider>
    </IconConfigProvider>
  );
}

export default function LinkifyRoot({ children }: { children: React.ReactNode }) {
  return (
    <Root>
      <Providers>{children}</Providers>
    </Root>
  );
}
